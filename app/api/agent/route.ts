import { NextResponse } from 'next/server';
import { getContent } from '@/content/load';
import { askFit, askGemini } from '@/server/gemini';
import { handleAgentRequest } from '@/server/agentHandler';
import { getAgentStore } from '@/server/getStore';
import { clientIp, ipHashSalt } from '@/server/request';
import { FALLBACK_TEXT } from '@/agent/actions';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  let question: unknown;
  let history: unknown;
  try {
    ({ question, history } = (await req.json()) as { question?: unknown; history?: unknown });
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
    const configured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);
    const notConfigured = async (): Promise<never> => {
      throw new Error('Gemini is not configured');
    };
    const ask: typeof askGemini = configured ? askGemini : notConfigured;
    const fit: typeof askFit = configured ? askFit : notConfigured;
    const { status, body } = await handleAgentRequest(
      { question, ip, history },
      {
        store: getAgentStore(),
        ask,
        fit,
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
