import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { useOS, resetOS } from '../store';
import { Window } from './Window';

const state = () => useOS.getState();
const win = (id: string) => state().windows.find((w) => w.id === id)!;

beforeEach(() => resetOS());
afterEach(() => cleanup());

describe('<Window>', () => {
  it('renders as a labelled dialog that Escape closes', async () => {
    const user = userEvent.setup();
    act(() => state().openApp('me'));
    render(<Window id="me">hi</Window>);
    // The open animation starts from opacity 0; wait for it to settle.
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'me.md' })).toBeVisible());
    await user.keyboard('{Escape}');
    expect(state().windows).toHaveLength(0);
  });

  it('minimises from its control button', async () => {
    const user = userEvent.setup();
    act(() => state().openApp('me'));
    render(<Window id="me">hi</Window>);
    await user.click(screen.getByRole('button', { name: 'Minimize me.md' }));
    expect(win('me').minimized).toBe(true);
  });

  it('closes from its control button', async () => {
    const user = userEvent.setup();
    act(() => state().openApp('me'));
    render(<Window id="me">hi</Window>);
    await user.click(screen.getByRole('button', { name: 'Close me.md' }));
    expect(state().windows).toHaveLength(0);
  });
});
