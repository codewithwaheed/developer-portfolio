import 'server-only';
import { generateText, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { APP_IDS } from '@/os/apps/registry';

const appId = z.enum(APP_IDS as [string, ...string[]]);

const tools = {
  open_app: tool({
    description: 'Open an app window on the desktop.',
    inputSchema: z.object({ app: appId }),
  }),
  close_app: tool({
    description: 'Close an app window.',
    inputSchema: z.object({ app: appId }),
  }),
  filter_projects: tool({
    description: 'Open the projects app filtered by tag and/or company.',
    inputSchema: z.object({
      tag: z.enum(['ai', 'blockchain', 'fintech', 'web']).optional(),
      company: z.string().optional(),
    }),
  }),
  open_project: tool({
    description: 'Open a single project by id.',
    inputSchema: z.object({ id: z.string() }),
  }),
  open_post: tool({
    description: 'Open a blog post by slug.',
    inputSchema: z.object({ slug: z.string() }),
  }),
  start_tour: tool({
    description: 'Start the guided tour of the portfolio.',
    inputSchema: z.object({}),
  }),
  say: tool({
    description: 'Say something to the visitor in the agent bubble.',
    inputSchema: z.object({ text: z.string() }),
  }),
};

export async function askGemini(
  question: string,
  system: string,
): Promise<{ text: string; rawToolCalls: unknown[] }> {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await generateText({
    model: google(process.env.GEMINI_MODEL as string),
    system,
    prompt: question,
    tools,
    maxOutputTokens: 400,
  });
  const rawToolCalls = result.toolCalls.map((c) => ({
    type: c.toolName as string,
    ...(c.input as Record<string, unknown>),
  }));
  let text = result.text.trim();
  if (!text) {
    const say = rawToolCalls.find((c) => c.type === 'say') as { text?: unknown } | undefined;
    if (typeof say?.text === 'string') text = say.text;
  }
  return { text, rawToolCalls };
}
