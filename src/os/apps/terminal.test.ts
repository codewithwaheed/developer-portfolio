import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioContent } from '@/content/types';
import { runCommand } from './terminal';

const content = {
  about: { html: '<p>I build <b>agents</b>.</p>', skills: ['ts'], photo: '/p.jpg' },
  jobs: [],
  projects: [],
  posts: [],
} as unknown as PortfolioContent;

const ctx = { openApp: vi.fn(), content };

beforeEach(() => ctx.openApp.mockClear());

describe('runCommand', () => {
  it('help lists commands', () => {
    expect(runCommand('help', ctx).output.join('\n')).toMatch(/ls.*cat.*open.*clear/s);
  });
  it('ls lists the desktop', () => {
    expect(runCommand('ls', ctx).output).toEqual([
      'me.md',
      'experience.app',
      'projects/',
      'consult.cal',
      'pensieve/',
      'resume.pdf',
    ]);
  });
  it('open accepts ids and titles', () => {
    runCommand('open projects', ctx);
    expect(ctx.openApp).toHaveBeenLastCalledWith('projects');
    runCommand('open projects/', ctx);
    expect(ctx.openApp).toHaveBeenLastCalledWith('projects');
    runCommand('open me.md', ctx);
    expect(ctx.openApp).toHaveBeenLastCalledWith('me');
  });
  it('open unknown reports', () => {
    expect(runCommand('open nope', ctx).output[0]).toBe('open: no such app: nope');
    expect(ctx.openApp).not.toHaveBeenCalled();
  });
  it('cat me.md prints name and stripped about', () => {
    const out = runCommand('cat me.md', ctx).output.join(' ');
    expect(out).toContain('Waheed');
    expect(out).toContain('I build agents.');
    expect(out).not.toContain('<p>');
  });
  it('sudo hire waheed opens consult', () => {
    expect(runCommand('sudo hire waheed', ctx).output.join(' ')).toMatch(/permission granted/i);
    expect(ctx.openApp).toHaveBeenCalledWith('consult');
  });
  it('clear and unknown', () => {
    expect(runCommand('clear', ctx).clear).toBe(true);
    expect(runCommand('rm -rf /', ctx).output[0]).toBe('command not found: rm');
    expect(runCommand('   ', ctx).output).toEqual([]);
  });
});
