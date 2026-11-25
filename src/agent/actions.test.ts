import { describe, expect, it } from 'vitest';
import { FALLBACK_TEXT, sanitizeActions } from './actions';

const known = {
  projectIds: ['financethat'],
  postSlugs: ['dark-mode-toggle'],
  companies: ['10Pearls'],
};

describe('sanitizeActions', () => {
  it('keeps valid actions and drops junk, unknown types, apps and ids', () => {
    expect(
      sanitizeActions(
        [
          { type: 'open_app', app: 'projects' },
          { type: 'open_app', app: 'finder' },
          { type: 'open_project', id: 'nope' },
          { type: 'rm' },
          'junk',
          { type: 'say', text: 'hi' },
        ],
        known,
      ),
    ).toEqual([
      { type: 'open_app', app: 'projects' },
      { type: 'say', text: 'hi' },
    ]);
  });

  it('returns [] for a non-array', () => {
    expect(sanitizeActions('not an array', known)).toEqual([]);
    expect(sanitizeActions(null, known)).toEqual([]);
  });

  it('caps say text at 600 characters', () => {
    expect(sanitizeActions([{ type: 'say', text: 'x'.repeat(2000) }], known)[0]).toMatchObject({
      text: expect.stringMatching(/^x{600}$/),
    });
  });

  it('validates project, post, close and start_tour actions', () => {
    expect(
      sanitizeActions(
        [
          { type: 'open_project', id: 'financethat' },
          { type: 'open_post', slug: 'dark-mode-toggle' },
          { type: 'open_post', slug: 'missing' },
          { type: 'close_app', app: 'me' },
          { type: 'close_app', app: 42 },
          { type: 'start_tour' },
          { type: 'say', text: 7 },
        ],
        known,
      ),
    ).toEqual([
      { type: 'open_project', id: 'financethat' },
      { type: 'open_post', slug: 'dark-mode-toggle' },
      { type: 'close_app', app: 'me' },
      { type: 'start_tour' },
    ]);
  });

  it('checks filter tags and normalises company spelling', () => {
    expect(
      sanitizeActions(
        [
          { type: 'filter_projects', tag: 'ai' },
          { type: 'filter_projects', tag: 'crypto' },
          { type: 'filter_projects', company: '10pearls' },
          { type: 'filter_projects', company: 'Acme' },
        ],
        known,
      ),
    ).toEqual([
      { type: 'filter_projects', tag: 'ai' },
      { type: 'filter_projects', company: '10Pearls' },
    ]);
  });

  it('exports the shared fallback text', () => {
    expect(FALLBACK_TEXT).toBe(
      "My neural core is cooling down. Here's what I can show you right now:",
    );
  });
});
