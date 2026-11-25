import { NextResponse } from 'next/server';
import { getContent } from '@/content/load';
import { askGemini } from '@/server/gemini';
import { handleAgentRequest } from '@/server/agentHandler';
import { getAgentStore } from '@/server/getStore';
import { FALLBACK_TEXT } from '@/agent/actions';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  let question: unknown;
  try {
    question = ((await req.json()) as { question?: unknown }).question;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
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
          salt: process.env.IP_HASH_SALT ?? '',
        },
      },
    );
    return NextResponse.json(body, { status });
  } catch {
    return NextResponse.json({ source: 'fallback', reason: 'error', text: FALLBACK_TEXT });
  }
}
