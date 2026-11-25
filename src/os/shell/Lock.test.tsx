import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Lock } from './Lock';

afterEach(cleanup);

describe('Lock', () => {
  it('is a focused dialog showing the prompt and classic link', () => {
    render(<Lock onWake={() => {}} />);
    const dlg = screen.getByRole('dialog', { name: 'Lock screen' });
    expect(dlg).toHaveFocus();
    expect(screen.getByText('click to wake')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'classic view' })).toHaveAttribute('href', '/classic');
  });
  it('wakes on Enter, Space and click', () => {
    const onWake = vi.fn();
    render(<Lock onWake={onWake} />);
    const dlg = screen.getByRole('dialog', { name: 'Lock screen' });
    fireEvent.keyDown(dlg, { key: 'Enter' });
    fireEvent.keyDown(dlg, { key: ' ' });
    fireEvent.click(dlg);
    expect(onWake).toHaveBeenCalledTimes(3);
  });
});

describe('Lock classic link', () => {
  it('does not wake when clicked', () => {
    const onWake = vi.fn();
    render(<Lock onWake={onWake} />);
    const link = screen.getByRole('link', { name: 'classic view' });
    link.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(link);
    expect(onWake).not.toHaveBeenCalled();
  });
});
