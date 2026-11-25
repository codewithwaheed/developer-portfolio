import { afterEach, describe, expect, it } from 'vitest';
import { resetOS, useOS } from '@/os/store';
import { resetAgent, useAgent } from './agentStore';
import { runAgentPlan } from './run';

afterEach(() => {
  resetAgent();
  resetOS();
});

describe('runAgentPlan', () => {
  it('a second plan aborts the first and keeps the agent acting until it finishes', async () => {
    const first = runAgentPlan([
      { type: 'open_app', app: 'me' },
      { type: 'open_app', app: 'experience' },
    ]);
    const second = runAgentPlan([
      { type: 'open_app', app: 'consult' },
      { type: 'open_app', app: 'messages' },
    ]);

    expect(await first).toBe('interrupted');
    expect(useAgent.getState().status).toBe('acting');
    expect(await second).toBe('done');
    expect(useAgent.getState().status).toBe('idle');

    const open = useOS.getState().windows.map((w) => w.id);
    expect(open).toEqual(expect.arrayContaining(['consult', 'messages']));
    expect(open).not.toContain('me');
  });

  it('reuses the controller of a start() that has no plan running yet', async () => {
    const signal = useAgent.getState().start();
    expect(await runAgentPlan([{ type: 'say', text: 'hi' }])).toBe('done');
    expect(signal.aborted).toBe(false);
    expect(useAgent.getState().reply).toBe('hi');
  });
});
