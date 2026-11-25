import type { PortfolioContent } from '@/content/types';
import { siteConfig } from '@/config/site';
import { APP_IDS, appMeta, isAppId, type AppId } from './registry';

export interface TerminalContext {
  openApp(id: AppId): void;
  content: PortfolioContent;
}

export interface CommandResult {
  output: string[];
  clear?: boolean;
}

const LS = ['me.md', 'experience.app', 'projects/', 'consult.cal', 'pensieve/', 'resume.pdf'];

const HELP = [
  'Commands:',
  '  help            show this list',
  '  ls              list the desktop',
  '  cat me.md       read the about text',
  '  open <app>      open an app (e.g. open projects)',
  '  clear           clear the screen',
];

const stripHtml = (html: string) =>
  html
    .replace(/<\/(p|li|h\d|div|ul|ol)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function resolveApp(arg: string): AppId | null {
  const q = arg.toLowerCase();
  if (isAppId(q)) return q;
  const stripped = q.replace(/\/$/, '');
  return (
    APP_IDS.find((id) => {
      const title = appMeta[id].title.toLowerCase();
      return title === q || title.replace(/\/$/, '') === stripped;
    }) ?? null
  );
}

export function runCommand(input: string, ctx: TerminalContext): CommandResult {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { output: [] };
  const [cmd, ...args] = words;

  switch (cmd) {
    case 'help':
      return { output: HELP };
    case 'ls':
      return { output: [...LS] };
    case 'clear':
      return { output: [], clear: true };
    case 'cat': {
      if (args[0] === 'me.md') {
        return {
          output: [siteConfig.name, siteConfig.title, '', stripHtml(ctx.content.about.html)],
        };
      }
      return { output: [args[0] ? `cat: ${args[0]}: No such file` : 'cat: missing file operand'] };
    }
    case 'open': {
      const target = args.join(' ');
      const id = target ? resolveApp(target) : null;
      if (!id) return { output: [`open: no such app: ${target}`] };
      ctx.openApp(id);
      return { output: [`opening ${appMeta[id].title}...`] };
    }
    case 'sudo':
      if (args.join(' ') === 'hire waheed') {
        ctx.openApp('consult');
        return { output: ['permission granted. Opening consult.cal...'] };
      }
      return { output: [`command not found: ${cmd}`] };
    default:
      return { output: [`command not found: ${cmd}`] };
  }
}
