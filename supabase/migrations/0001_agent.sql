-- AgentOS: rate limits, daily ceiling, answer cache, question log.
-- Requires pg_cron (Database -> Extensions). Only the service key touches these tables.

create table if not exists rate_limits (
  ip_hash text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create table if not exists daily_usage (
  day date primary key,
  count int not null default 0
);

create table if not exists answer_cache (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- Never cleaned up; stores no IP or identifier.
create table if not exists question_log (
  id bigserial primary key,
  question text not null,
  intent text,
  source text not null,
  created_at timestamptz not null default now()
);

-- RLS on, no policies: anon/authenticated get nothing; the service key bypasses RLS.
alter table rate_limits enable row level security;
alter table daily_usage enable row level security;
alter table answer_cache enable row level security;
alter table question_log enable row level security;

-- Atomic: the upsert only touches the row when allowed (window expired or under cap).
-- No returned row means the visitor is at the cap.
create or replace function consume_visitor(p_hash text, p_cap int)
returns table (allowed boolean, remaining int)
language plpgsql
as $$
declare
  v_count int;
begin
  if p_cap <= 0 then
    return query select false, 0;
    return;
  end if;

  insert into rate_limits as r (ip_hash, count, window_start)
  values (p_hash, 1, now())
  on conflict (ip_hash) do update
    set count = case
          when r.window_start < now() - interval '24 hours' then 1
          else r.count + 1
        end,
        window_start = case
          when r.window_start < now() - interval '24 hours' then now()
          else r.window_start
        end
    where r.window_start < now() - interval '24 hours' or r.count < p_cap
  returning r.count into v_count;

  if v_count is null then
    return query select false, 0;
  else
    return query select true, greatest(p_cap - v_count, 0);
  end if;
end;
$$;

-- Gemini quotas reset at midnight Pacific, so the day key is the Pacific date.
create or replace function consume_daily(p_ceiling int)
returns boolean
language plpgsql
as $$
declare
  v_count int;
begin
  if p_ceiling <= 0 then
    return false;
  end if;

  insert into daily_usage as d (day, count)
  values ((now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (day) do update
    set count = d.count + 1
    where d.count < p_ceiling
  returning d.count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function consume_visitor(text, int) from public, anon, authenticated;
revoke all on function consume_daily(int) from public, anon, authenticated;

-- Daily cleanup at 03:00 UTC. Never touches question_log.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'agentos-cleanup') then
    perform cron.unschedule('agentos-cleanup');
  end if;
end $$;

select cron.schedule(
  'agentos-cleanup',
  '0 3 * * *',
  $job$
    delete from rate_limits where window_start < now() - interval '24 hours';
    delete from answer_cache where created_at < now() - interval '24 hours';
    delete from daily_usage where day < (now() at time zone 'America/Los_Angeles')::date - 7;
  $job$
);
