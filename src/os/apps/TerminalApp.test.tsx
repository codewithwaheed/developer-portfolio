import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PortfolioContent } from '@/content/types';
import { resetOS } from '../store';
import { TerminalApp } from './TerminalApp';

const content = {
  about: { html: '<p>x</p>', skills: [], photo: '' },
  jobs: [],
  projects: [],
  posts: [],
} as unknown as PortfolioContent;

beforeEach(() => resetOS());
afterEach(() => cleanup());

describe('<TerminalApp>', () => {
  it('autofocuses, runs commands and recalls history with arrows', () => {
    render(<TerminalApp content={content} />);
    const input = screen.getByLabelText('terminal input') as HTMLInputElement;
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'ls' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('projects/')).toBeInTheDocument();
    expect(input.value).toBe('');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('ls');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('');
  });
});
