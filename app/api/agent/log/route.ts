import { getAgentStore } from '@/server/getStore';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  try {
    const { question, intent } = (await req.json()) as { question?: unknown; intent?: unknown };
    const q = typeof question === 'string' ? question.trim() : '';
    if (
      q &&
      q.length <= 500 &&
      typeof intent === 'string' &&
      intent.length > 0 &&
      intent.length <= 64
    ) {
      await getAgentStore().logQuestion({ question: q, intent, source: 'scripted' });
    }
  } catch {
    // logging is best-effort
  }
  return new Response(null, { status: 204 });
}
