import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Post } from '@/content/types';
import { siteConfig } from '@/config/site';
import { resetOS, useOS } from '../store';
import { PensieveApp } from './PensieveApp';
import { MessagesApp } from './MessagesApp';
import { SettingsApp } from './SettingsApp';
import { ConsultApp } from './ConsultApp';

const post = (slug: string): Post => ({
  slug,
  title: `T-${slug}`,
  description: 'd',
  date: '2024-01-01',
  tags: [],
  html: `<p>body-${slug}</p>`,
});

beforeEach(() => resetOS());
afterEach(() => cleanup());

describe('utility apps', () => {
  it('pensieve syncs selection with openPostSlug', () => {
    render(<PensieveApp posts={[post('a'), post('b')]} />);
    expect(screen.getByText('body-a')).toBeInTheDocument();
    act(() => useOS.getState().openPost('b'));
    expect(screen.getByText('body-b')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /T-a/ }));
    expect(useOS.getState().openPostSlug).toBe('a');
  });

  it('messages has mailto and safe social links', () => {
    render(<MessagesApp />);
    expect(screen.getByRole('link', { name: siteConfig.email })).toHaveAttribute(
      'href',
      `mailto:${siteConfig.email}`,
    );
    const gh = screen.getByRole('link', { name: 'GitHub' });
    expect(gh).toHaveAttribute('target', '_blank');
    expect(gh).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('settings switches default on and toggle', () => {
    render(<SettingsApp skills={['TypeScript', 'Go']} />);
    const sw = screen.getByRole('switch', { name: 'Go' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('consult iframe is titled and lazy', () => {
    render(<ConsultApp />);
    const f = screen.getByTitle('Book a free consultation');
    expect(f).toHaveAttribute('loading', 'lazy');
    expect(f).toHaveAttribute('src', siteConfig.bookingUrl);
  });
});
