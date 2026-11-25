import { getAgentStore } from '@/server/getStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Daily keep-alive: pings the agent store so the free Supabase project does not pause. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    await getAgentStore().ping();
    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
