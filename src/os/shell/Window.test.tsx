import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { AnimatePresence } from 'motion/react';
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

  it('stops catching clicks once minimised', async () => {
    const user = userEvent.setup();
    act(() => state().openApp('me'));
    const { container } = render(<Window id="me">hi</Window>);
    const wrapper = container.querySelector('[data-window="me"]')!.parentElement!;
    expect(wrapper).not.toHaveStyle({ pointerEvents: 'none' });
    await user.click(screen.getByRole('button', { name: 'Minimize me.md' }));
    expect(wrapper).toHaveStyle({ pointerEvents: 'none' });
  });

  it('keeps rendering while its close animation plays, then unmounts', async () => {
    function Desktop() {
      const windows = useOS((s) => s.windows);
      return (
        <AnimatePresence>
          {windows.map((w) => (
            <Window key={w.id} id={w.id}>
              hi
            </Window>
          ))}
        </AnimatePresence>
      );
    }
    act(() => state().openApp('me'));
    const { container } = render(<Desktop />);
    const found = () => container.querySelector('[data-window="me"]');
    expect(found()).not.toBeNull();

    act(() => state().closeApp('me'));
    // Still on screen (and no longer interactive) while exiting.
    expect(found()).not.toBeNull();
    expect(found()).toHaveTextContent('hi');
    expect(found()!.parentElement).toHaveStyle({ pointerEvents: 'none' });
    await waitFor(() => expect(found()).toBeNull());
  });
});
