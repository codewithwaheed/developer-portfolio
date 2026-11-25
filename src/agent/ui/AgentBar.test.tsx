import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AgentBar } from './AgentBar';
import { resetAgent } from '../agentStore';

afterEach(() => {
  cleanup();
  resetAgent();
});

describe('AgentBar', () => {
  it('focuses on Cmd+K and submits trimmed text on Enter', () => {
    const onSubmit = vi.fn();
    render(<AgentBar onSubmit={onSubmit} onTour={() => {}} />);
    const input = screen.getByPlaceholderText('Ask AgentOS anything…');
    expect(input).not.toHaveFocus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '  who are you?  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('who are you?');
    expect(input).toHaveValue('');
  });

  it('shows suggestion chips when empty and submits one on click', () => {
    const onSubmit = vi.fn();
    render(<AgentBar onSubmit={onSubmit} onTour={() => {}} suggestions={['Who are you?']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Who are you?' }));
    expect(onSubmit).toHaveBeenCalledWith('Who are you?');
  });
  it('renders as a bottom sheet: input when collapsed, chips once expanded', () => {
    const onSubmit = vi.fn();
    render(
      <AgentBar
        variant="sheet"
        onSubmit={onSubmit}
        onTour={() => {}}
        suggestions={['Who are you?']}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Ask AgentOS' });
    expect(input.closest('[data-agent-bar]')).toHaveAttribute('data-variant', 'sheet');
    expect(screen.queryByRole('list', { name: 'Suggestions' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand agent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Who are you?' }));
    expect(onSubmit).toHaveBeenCalledWith('Who are you?');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse agent' }));
    expect(screen.getByRole('button', { name: 'Expand agent' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
