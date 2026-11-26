import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AgentBar } from './AgentBar';
import { resetAgent, useAgent } from '../agentStore';

afterEach(() => {
  cleanup();
  resetAgent();
});

describe('AgentBar', () => {
  it('focuses on Cmd+K and submits trimmed text on Enter', () => {
    const onSubmit = vi.fn();
    render(<AgentBar onSubmit={onSubmit} onTour={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Ask AgentOS' });
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

  it.each(['bar', 'sheet'] as const)('shows the reply once in the chat (%s)', async (variant) => {
    const { container } = render(
      <AgentBar variant={variant} onSubmit={() => {}} onTour={() => {}} />,
    );
    const reply = "Here's Waheed's AI work.";
    act(() => {
      useAgent.getState().pushUser('show me your ai work');
      useAgent.getState().setReply(reply);
    });
    const visibleText = () => {
      const clone = container.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.sr-only').forEach((n) => n.remove());
      return clone.textContent!;
    };
    await vi.waitFor(() => expect(visibleText().split(reply).length - 1).toBe(1), {
      timeout: 3000,
    });
    // Screen readers get the reply once through the polite live region.
    expect(screen.getByRole('status')).toHaveTextContent(reply);
    expect(visibleText()).toContain('show me your ai work');
  });

  it('minimizes the chat to a pill, restores it, and toggles maximize', () => {
    render(<AgentBar onSubmit={() => {}} onTour={() => {}} />);
    act(() => {
      useAgent.getState().pushUser('hi');
      useAgent.getState().setReply('Hello there');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Maximize conversation' }));
    expect(screen.getByRole('button', { name: 'Restore size' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize conversation' }));
    expect(screen.queryByRole('region', { name: 'Conversation with the agent' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand conversation' }));
    expect(screen.getByRole('button', { name: 'Minimize conversation' })).toBeInTheDocument();
  });
});
