import { getAgentStore } from '@/server/getStore';
import { hashIp } from '@/server/store';
import { clientIp, ipHashSalt, LOG_CAP } from '@/server/request';

export const runtime = 'nodejs';

const INTENT = /^[a-z0-9-]{1,64}$/;

export async function POST(req: Request): Promise<Response> {
  try {
    const { question, intent } = (await req.json()) as { question?: unknown; intent?: unknown };
    const q = typeof question === 'string' ? question.trim() : '';
    const salt = ipHashSalt();
    if (
      q &&
      q.length <= 500 &&
      typeof intent === 'string' &&
      INTENT.test(intent) &&
      salt !== null
    ) {
      const store = getAgentStore();
      const { allowed } = await store.consumeVisitor('log:' + hashIp(clientIp(req), salt), LOG_CAP);
      if (allowed) await store.logQuestion({ question: q, intent, source: 'scripted' });
    }
  } catch {
    // logging is best-effort
  }
  return new Response(null, { status: 204 });
}
