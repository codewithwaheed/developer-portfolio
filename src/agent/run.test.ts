import { afterEach, describe, expect, it } from 'vitest';
import { resetOS, useOS } from '@/os/store';
import { LOG_DIVIDER, resetAgent, useAgent } from './agentStore';
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

  it('continues the run that owns an explicit signal', async () => {
    const signal = useAgent.getState().start();
    expect(await runAgentPlan([{ type: 'say', text: 'hi' }], { signal })).toBe('done');
    expect(signal.aborted).toBe(false);
    expect(useAgent.getState().reply).toBe('hi');
    expect(useAgent.getState().status).toBe('idle');
  });

  it('without a signal always starts its own run, even while thinking', async () => {
    const signal = useAgent.getState().start();
    expect(await runAgentPlan([{ type: 'say', text: 'hi' }])).toBe('done');
    expect(signal.aborted).toBe(true);
  });

  it('a superseded signal does not run', async () => {
    const stale = useAgent.getState().start();
    useAgent.getState().start();
    expect(await runAgentPlan([{ type: 'open_app', app: 'me' }], { signal: stale })).toBe(
      'interrupted',
    );
    expect(useOS.getState().windows).toEqual([]);
  });

  it('keeps earlier agent.log lines and appends a new run under a divider', async () => {
    useAgent.getState().pushLog('old line');
    const signal = useAgent.getState().start();
    await runAgentPlan([{ type: 'say', text: 'hi' }], { signal, initialLog: ['✓ understood: x'] });
    expect(useAgent.getState().log).toEqual(['old line', LOG_DIVIDER, '✓ understood: x']);
  });
});

describe('agentStore.start', () => {
  it('clears a stale reply and the fallback flag', () => {
    useAgent.setState({ reply: 'old answer', fallback: true });
    useAgent.getState().start();
    expect(useAgent.getState().reply).toBe('');
    expect(useAgent.getState().fallback).toBe(false);
    expect(useAgent.getState().status).toBe('thinking');
  });
});
