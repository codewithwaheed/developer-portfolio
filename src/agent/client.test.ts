import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioContent } from '@/content/types';
import { resetOS, useOS } from '@/os/store';
import { FALLBACK_TEXT } from './actions';
import { resetAgent, useAgent } from './agentStore';
import { ask, setAskContent } from './client';
import { runAgentPlan } from './run';
import { TOUR } from './tour';

const content: PortfolioContent = {
  about: { html: '', skills: [], photo: '/me.jpg' },
  jobs: [
    {
      slug: 'acme',
      title: 'Engineer',
      company: 'Acme',
      location: '',
      range: '2020',
      url: '',
      bullets: [],
      order: 1,
    },
  ],
  projects: [
    {
      id: 'vafacosmo',
      title: 'VaffaCosmo-NFT',
      description: '',
      tech: [],
      tags: ['blockchain'],
      company: 'Acme',
      featured: true,
      date: '2022',
    },
  ],
  posts: [{ slug: 'hello-world', title: 'Hello', description: '', date: '', tags: [], html: '' }],
};

const json = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const deferred = () => {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
};

let fetchMock: ReturnType<typeof vi.fn>;
let sendBeacon: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  sendBeacon = vi.fn();
  Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
  setAskContent(content);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAgent();
  resetOS();
});

describe('ask: tour', () => {
  const stubMotion = (reduce: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: reduce && q.includes('reduce'),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));

  it('hands over to TOUR, runs every stop and settles idle', async () => {
    stubMotion(true);
    await ask('give me a tour');
    await vi.waitFor(() => expect(useOS.getState().windows.map((w) => w.id)).toContain('consult'), {
      timeout: 2000,
    });
    await vi.waitFor(() => expect(useAgent.getState().status).toBe('idle'));
    expect(useOS.getState().windows.map((w) => w.id)).toEqual(
      expect.arrayContaining(['me', 'experience', 'projects', 'consult']),
    );
    expect(useAgent.getState().reply).toMatch(/tour/);
  });

  it('an interrupt mid-tour wins', async () => {
    stubMotion(false);
    await ask('give me a tour');
    await vi.waitFor(() => expect(useOS.getState().windows.map((w) => w.id)).toContain('me'));
    useAgent.getState().abort();
    await new Promise((r) => setTimeout(r, 900));
    expect(useOS.getState().windows.map((w) => w.id)).not.toContain('consult');
    expect(useAgent.getState().status).toBe('idle');
  });
});

describe('ask: overlapping runs', () => {
  const stubMotion = () =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
  const openIds = () => useOS.getState().windows.map((w) => w.id);

  it('tour pressed during a question: a fallback answer leaves the tour running and interruptible', async () => {
    stubMotion();
    const res = deferred();
    fetchMock.mockReturnValueOnce(res.promise);
    const asking = ask('rust vs go?');
    expect(useAgent.getState().status).toBe('thinking');
    const tour = runAgentPlan(TOUR);
    res.resolve(json({ source: 'fallback', reason: 'daily_cap', text: FALLBACK_TEXT }));
    await asking;
    expect(useAgent.getState().status).toBe('acting');
    expect(useAgent.getState().fallback).toBe(false);
    expect(useAgent.getState().reply).not.toBe(FALLBACK_TEXT);
    expect(useAgent.getState().controller).toBeDefined();
    await vi.waitFor(() => expect(openIds()).toContain('me'));
    useAgent.getState().abort();
    expect(await tour).toBe('interrupted');
    await new Promise((r) => setTimeout(r, 900));
    expect(openIds()).not.toContain('consult');
    expect(useAgent.getState().status).toBe('idle');
  });

  it('tour pressed during a question: a model answer does not abort the tour', async () => {
    stubMotion();
    const res = deferred();
    fetchMock.mockReturnValueOnce(res.promise);
    const asking = ask('rust vs go?');
    const tour = runAgentPlan(TOUR);
    res.resolve(
      json({ source: 'gemini', text: 'Rust.', actions: [{ type: 'open_app', app: 'resume' }] }),
    );
    await asking;
    expect(useAgent.getState().status).toBe('acting');
    expect(useAgent.getState().reply).not.toBe('Rust.');
    useAgent.getState().abort();
    expect(await tour).toBe('interrupted');
    expect(openIds()).not.toContain('resume');
  });

  it('a question asked during the tour supersedes it', async () => {
    stubMotion();
    const tour = runAgentPlan(TOUR);
    await vi.waitFor(() => expect(openIds()).toContain('me'));
    fetchMock.mockResolvedValueOnce(
      json({ source: 'fallback', reason: 'daily_cap', text: FALLBACK_TEXT }),
    );
    await ask('rust vs go?');
    expect(await tour).toBe('interrupted');
    expect(useAgent.getState().reply).toBe(FALLBACK_TEXT);
    expect(useAgent.getState().fallback).toBe(true);
    expect(useAgent.getState().status).toBe('idle');
    await new Promise((r) => setTimeout(r, 900));
    expect(openIds()).not.toContain('consult');
  });
});

describe('ask', () => {
  it('keeps the understood line in agent.log for a scripted intent', async () => {
    await ask('who are you');
    expect(useAgent.getState().log[0]).toBe('✓ understood: who');
  });

  it('clears the previous reply while thinking', async () => {
    useAgent.setState({ reply: 'stale answer' });
    const res = deferred();
    fetchMock.mockReturnValueOnce(res.promise);
    const asking = ask('rust vs go?');
    expect(useAgent.getState().reply).toBe('');
    res.resolve(json({ source: 'gemini', text: 'fresh', actions: [] }));
    await asking;
    expect(useAgent.getState().reply).toBe('fresh');
  });

  it('ignores blank input', async () => {
    await ask('   ');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAgent.getState().status).toBe('idle');
  });

  it('answers a scripted intent with no network call and sends the log beacon', async () => {
    await ask('  who are you  ');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeacon).toHaveBeenCalledWith(
      '/api/agent/log',
      JSON.stringify({ question: 'who are you', intent: 'who' }),
    );
    expect(useOS.getState().windows.map((w) => w.id)).toContain('me');
    expect(useAgent.getState().reply).toMatch(/Waheed/);
  });

  it('survives a missing or throwing sendBeacon', async () => {
    sendBeacon.mockImplementation(() => {
      throw new Error('blocked');
    });
    await expect(ask('who are you')).resolves.toBeUndefined();
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
    await expect(ask('who are you')).resolves.toBeUndefined();
  });

  it('posts unmatched questions to /api/agent without a beacon', async () => {
    fetchMock.mockResolvedValueOnce(json({ source: 'fallback', text: FALLBACK_TEXT }));
    await ask('rust vs go?');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: 'rust vs go?', history: [] }),
      }),
    );
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('runs sanitized model actions and shows the model text', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        source: 'gemini',
        text: 'Rust is neat.',
        actions: [
          { type: 'open_project', id: 'nope' },
          { type: 'open_post', slug: 'hello-world' },
          { type: 'filter_projects', company: 'acme' },
        ],
      }),
    );
    await ask('rust vs go?');
    expect(useAgent.getState().reply).toBe('Rust is neat.');
    expect(useOS.getState().windows.map((w) => w.id)).toContain('pensieve');
    expect(useOS.getState().projectFilter).toEqual({ company: 'Acme' });
    expect(useAgent.getState().status).toBe('idle');
    expect(useAgent.getState().fallback).toBe(false);
  });

  it('does not overwrite a say action with the response text', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ source: 'cache', text: 'ignored', actions: [{ type: 'say', text: 'from the plan' }] }),
    );
    await ask('rust vs go?');
    expect(useAgent.getState().reply).toBe('from the plan');
  });

  it('shows the fallback copy and chips on a fallback response', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ source: 'fallback', reason: 'daily_cap', text: FALLBACK_TEXT }),
    );
    await ask('rust vs go?');
    expect(useAgent.getState().reply).toMatch(/^My neural core is cooling down/);
    expect(useAgent.getState().fallback).toBe(true);
    expect(useAgent.getState().status).toBe('idle');
  });

  it('falls back on a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await ask('rust vs go?');
    expect(useAgent.getState().reply).toBe(FALLBACK_TEXT);
    expect(useAgent.getState().fallback).toBe(true);
    expect(useAgent.getState().status).toBe('idle');
  });

  it('falls back on an unparseable body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => Promise.reject(new SyntaxError('bad')),
    } as unknown as Response);
    await ask('rust vs go?');
    expect(useAgent.getState().reply).toBe(FALLBACK_TEXT);
  });

  it('stays quiet when the request was superseded', async () => {
    fetchMock.mockImplementationOnce(async (_u: string, init: RequestInit) => {
      useAgent.getState().abort();
      init.signal?.throwIfAborted();
      return json({});
    });
    await ask('rust vs go?');
    expect(useAgent.getState().reply).toBe('');
    expect(useAgent.getState().fallback).toBe(false);
  });
});

describe('ask: conversation', () => {
  it('keeps the conversation and sends earlier turns as history', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ source: 'gemini', text: 'Not in my memory banks yet!', actions: [] }),
      )
      .mockResolvedValueOnce(json({ source: 'gemini', text: 'He loves React.', actions: [] }));
    await ask("what's waheed's favourite food?");
    await ask('and what about his frontend skills these days?');
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.history).toEqual([
      { role: 'user', text: "what's waheed's favourite food?" },
      { role: 'agent', text: 'Not in my memory banks yet!' },
    ]);
    expect(useAgent.getState().messages.map((m) => m.role)).toEqual([
      'user',
      'agent',
      'user',
      'agent',
    ]);
  });

  it('sends long questions to the model even when an intent matches', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ source: 'gemini', text: 'Yes, lots of AI.', actions: [] }),
    );
    await ask('does he have hands-on experience shipping AI features to production users?');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(useAgent.getState().reply).toBe('Yes, lots of AI.');
  });

  it('answers from the scripted plan when the model is unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ source: 'fallback', reason: 'quota', text: FALLBACK_TEXT }),
    );
    await ask('could you please show me all of his AI work in detail');
    expect(useOS.getState().windows.map((w) => w.id)).toContain('projects');
    expect(useAgent.getState().reply).not.toBe(FALLBACK_TEXT);
    expect(sendBeacon).toHaveBeenCalled();
  });

  it('attaches a validated fit report to the reply', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        source: 'gemini',
        text: 'Strong fit.',
        actions: [],
        fit: { verdict: 'strong', summary: 'Strong fit.', matches: [], gaps: [], projectIds: [] },
      }),
    );
    await ask('x '.repeat(400));
    const last = useAgent.getState().messages.at(-1)!;
    expect(last.fit?.verdict).toBe('strong');
  });
});
