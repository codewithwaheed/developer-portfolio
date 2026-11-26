import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentAction } from './actions';
import { runPlan, type ExecutorDeps } from './executor';

function makeDeps() {
  return {
    moveCursorTo: vi.fn<(selector: string) => Promise<void>>(async () => {}),
    click: vi.fn(async () => {}),
    os: {
      openApp: vi.fn(),
      closeApp: vi.fn(),
      setProjectFilter: vi.fn(),
      openProject: vi.fn(),
      openPost: vi.fn(),
    },
    log: vi.fn(),
    say: vi.fn(),
    startTour: vi.fn(),
    reducedMotion: false,
  } satisfies ExecutorDeps;
}

const open = (app: 'me' | 'experience'): AgentAction => ({ type: 'open_app', app });

let deps: ReturnType<typeof makeDeps>;
let ctrl: AbortController;
beforeEach(() => {
  deps = makeDeps();
  ctrl = new AbortController();
});

describe('runPlan', () => {
  it('moves the cursor to the icon, opens the app and filters', async () => {
    const result = await runPlan(
      [
        { type: 'open_app', app: 'projects' },
        { type: 'filter_projects', tag: 'ai' },
      ],
      deps,
      ctrl.signal,
    );
    expect(result).toBe('done');
    expect(deps.moveCursorTo).toHaveBeenCalledWith('[data-app-icon="projects"]');
    expect(deps.moveCursorTo).toHaveBeenCalledTimes(1);
    expect(deps.click).toHaveBeenCalledTimes(1);
    expect(deps.os.openApp).toHaveBeenCalledWith('projects');
    expect(deps.os.setProjectFilter).toHaveBeenCalledWith({ tag: 'ai' });
    expect(deps.log).toHaveBeenCalledWith('✓ opened projects/');
    expect(deps.log).toHaveBeenCalledWith('✓ filtered by AI');
  });

  it('stops after the action that aborted', async () => {
    deps.os.openApp.mockImplementation(() => ctrl.abort());
    expect(await runPlan([open('me'), open('experience')], deps, ctrl.signal)).toBe('interrupted');
    expect(deps.os.openApp).toHaveBeenCalledTimes(1);
  });

  it('does nothing when already aborted', async () => {
    ctrl.abort();
    expect(await runPlan([open('me')], deps, ctrl.signal)).toBe('interrupted');
    expect(deps.os.openApp).not.toHaveBeenCalled();
  });

  it('stops when aborted during cursor travel', async () => {
    deps.moveCursorTo.mockImplementation(async () => ctrl.abort());
    expect(await runPlan([open('me')], deps, ctrl.signal)).toBe('interrupted');
    expect(deps.click).not.toHaveBeenCalled();
    expect(deps.os.openApp).not.toHaveBeenCalled();
  });

  it('skips cursor travel under reduced motion', async () => {
    await runPlan([open('me')], { ...deps, reducedMotion: true }, ctrl.signal);
    expect(deps.moveCursorTo).not.toHaveBeenCalled();
    expect(deps.os.openApp).toHaveBeenCalledWith('me');
  });

  it('opens projects before pointing at a project row', async () => {
    await runPlan([{ type: 'open_project', id: 'financethat' }], deps, ctrl.signal);
    expect(deps.moveCursorTo.mock.calls.map((c) => c[0])).toEqual([
      '[data-app-icon="projects"]',
      '[data-project-id="financethat"]',
    ]);
    expect(deps.os.openApp).toHaveBeenCalledWith('projects');
    expect(deps.os.openProject).toHaveBeenCalledWith('financethat');
  });

  it('opens pensieve then the post, closes apps, says and starts the tour', async () => {
    await runPlan(
      [
        { type: 'open_post', slug: 'dark-mode-toggle' },
        { type: 'close_app', app: 'me' },
        { type: 'say', text: 'hello' },
        { type: 'start_tour' },
      ],
      { ...deps, reducedMotion: true },
      ctrl.signal,
    );
    expect(deps.os.openApp).toHaveBeenCalledWith('pensieve');
    expect(deps.os.openPost).toHaveBeenCalledWith('dark-mode-toggle');
    expect(deps.os.closeApp).toHaveBeenCalledWith('me');
    expect(deps.say).toHaveBeenCalledWith('hello');
    expect(deps.startTour).toHaveBeenCalledTimes(1);
  });

  it('waits for a caption to be read before the next step when sayDwellMs is set', async () => {
    vi.useFakeTimers();
    try {
      const dwell = vi.fn(() => 1000);
      const run = runPlan(
        [{ type: 'say', text: 'caption' }, open('me')],
        { ...deps, reducedMotion: true, sayDwellMs: dwell },
        ctrl.signal,
      );
      await vi.advanceTimersByTimeAsync(500);
      expect(deps.os.openApp).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(600);
      await run;
      expect(dwell).toHaveBeenCalledWith('caption');
      expect(deps.os.openApp).toHaveBeenCalledWith('me');
    } finally {
      vi.useRealTimers();
    }
  });
});
