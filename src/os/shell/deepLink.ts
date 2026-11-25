import { isAppId, type AppId } from '../apps/registry';

export interface DeepLink {
  app?: AppId;
  post?: string;
}

/** Parses `?app=<AppId>` and `?post=<slug>`; a valid post always implies pensieve. */
export function parseDeepLink(search: string, postSlugs: string[]): DeepLink {
  const params = new URLSearchParams(search);
  const app = params.get('app');
  const post = params.get('post');
  const validPost = post !== null && postSlugs.includes(post) ? post : undefined;
  if (validPost) return { app: 'pensieve', post: validPost };
  if (isAppId(app)) return { app };
  return {};
}
