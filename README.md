<h1 align="center">
  codewithwaheed.com
</h1>

![demo](https://raw.githubusercontent.com/codewithwaheed/developer-portfolio/main/src/images/demo.png)

## Development

```sh
npm install
npm run dev
npm test
```

## Supabase setup (AI agent state)

The `/api/agent` route keeps rate limits, the daily ceiling, the answer cache and a question log in Supabase. Without Supabase configured, local dev falls back to an in-memory store.

1. Create a Supabase project.
2. In Database -> Extensions, enable `pg_cron`.
3. Run `supabase/migrations/0001_agent.sql` in the SQL editor (or `supabase db push`).
4. Set the env vars from `.env.example` in Vercel (server-side only, never `NEXT_PUBLIC_`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SALT`, plus the Gemini and agent limit settings.

Launch checklist: `IP_HASH_SALT` must be a long random value (e.g. `openssl rand -hex 32`). In production the agent refuses to run (fallback replies, no Gemini calls, no logging) until it is set.

All tables have row-level security enabled with no policies, so only the service key can read or write them. Raw IPs are never stored (salted SHA-256 only), and a daily `agentos-cleanup` job removes expired rate-limit and cache rows. The question log is kept and holds no identifiers.
