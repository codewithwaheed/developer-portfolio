import { NextResponse } from 'next/server';
import { getContent } from '@/content/load';
import { askGemini } from '@/server/gemini';
import { handleAgentRequest } from '@/server/agentHandler';
import { getAgentStore } from '@/server/getStore';
import { clientIp, ipHashSalt } from '@/server/request';
import { FALLBACK_TEXT } from '@/agent/actions';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  let question: unknown;
  try {
    question = ((await req.json()) as { question?: unknown }).question;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const ip = clientIp(req);
  const fallback = () =>
    NextResponse.json({ source: 'fallback', reason: 'error', text: FALLBACK_TEXT });
  // Production without a salt: no Gemini call and no store writes.
  const salt = ipHashSalt();
  if (salt === null) return fallback();
  try {
    const ask: typeof askGemini =
      process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL
        ? askGemini
        : async () => {
            throw new Error('Gemini is not configured');
          };
    const { status, body } = await handleAgentRequest(
      { question, ip },
      {
        store: getAgentStore(),
        ask,
        content: await getContent(),
        env: {
          cap: Number(process.env.AGENT_VISITOR_CAP) || 5,
          ceiling: Number(process.env.AGENT_DAILY_CEILING) || 200,
          salt,
        },
      },
    );
    return NextResponse.json(body, { status });
  } catch {
    return fallback();
  }
}
