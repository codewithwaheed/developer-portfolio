import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { Project } from '@/content/types';
import { resetOS, useOS } from '../store';
import { ProjectsApp } from './ProjectsApp';

const project: Project = {
  id: 'bot',
  title: 'Bot',
  description: '<p>desc</p>',
  tech: ['ts'],
  tags: ['ai'],
  featured: true,
  date: '2024-01-01',
  github: 'https://github.com/x/bot',
  cta: 'https://medium.com/@x/bot-article',
};

beforeEach(() => resetOS());
afterEach(() => cleanup());

describe('<ProjectsApp> detail links', () => {
  it('renders GitHub and Article links, never a URL as a name', () => {
    render(<ProjectsApp projects={[project]} />);
    act(() => useOS.getState().openProject('bot'));
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', project.github);
    expect(screen.getByRole('link', { name: 'Article' })).toHaveAttribute('href', project.cta);
    expect(screen.queryByRole('link', { name: 'Live' })).toBeNull();
    for (const l of screen.getAllByRole('link')) {
      expect(l.textContent).not.toMatch(/^https?:/);
      expect(l).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    }
  });
});
