import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { cursor, GhostCursor } from './GhostCursor';
import { resetAgent, useAgent } from '../agentStore';

afterEach(() => {
  cleanup();
  resetAgent();
  document.body.innerHTML = '';
});

const ghost = () => document.querySelector('[data-ghost-cursor]')!;

describe('GhostCursor', () => {
  it('stays hidden while acting until it is placed on a target', async () => {
    render(<GhostCursor />);
    const target = document.createElement('button');
    target.dataset.appIcon = 'me';
    target.getBoundingClientRect = () => new DOMRect(100, 100, 40, 40);
    document.body.appendChild(target);

    act(() => {
      useAgent.getState().start();
      useAgent.getState().setStatus('acting');
    });
    expect(ghost()).toHaveAttribute('data-visible', 'false');

    await act(() => cursor.moveTo('[data-app-icon="me"]'));
    expect(ghost()).toHaveAttribute('data-visible', 'true');

    // A new plan starts hidden again.
    act(() => {
      useAgent.getState().start();
      useAgent.getState().setStatus('acting');
    });
    expect(ghost()).toHaveAttribute('data-visible', 'false');
  });
});
