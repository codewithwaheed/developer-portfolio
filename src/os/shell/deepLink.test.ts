import { describe, expect, it } from 'vitest';
import { parseDeepLink } from './deepLink';

describe('parseDeepLink', () => {
  it('reads a valid app', () => {
    expect(parseDeepLink('?app=projects', [])).toEqual({ app: 'projects' });
  });
  it('ignores an unknown app', () => {
    expect(parseDeepLink('?app=nope', [])).toEqual({});
  });
  it('opens pensieve on a known post', () => {
    expect(parseDeepLink('?app=pensieve&post=a', ['a'])).toEqual({ app: 'pensieve', post: 'a' });
    expect(parseDeepLink('?post=a', ['a'])).toEqual({ app: 'pensieve', post: 'a' });
  });
  it('ignores an unknown post slug', () => {
    expect(parseDeepLink('?post=zzz', ['a'])).toEqual({});
    expect(parseDeepLink('?app=pensieve&post=zzz', ['a'])).toEqual({ app: 'pensieve' });
  });
});
