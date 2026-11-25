import {
  IconCalendar,
  IconCpu,
  IconFileText,
  IconFileTypePdf,
  IconFolder,
  IconListDetails,
  IconMessageCircle,
  IconNotebook,
  IconSettings,
  IconTerminal2,
  type Icon,
} from '@tabler/icons-react';
import { appMeta, type AppId } from './registry';

/** The single place mapping registry icon names (Tabler) to components. */
const ICONS: Record<string, Icon> = {
  'file-text': IconFileText,
  cpu: IconCpu,
  folder: IconFolder,
  calendar: IconCalendar,
  notebook: IconNotebook,
  'message-circle': IconMessageCircle,
  'file-type-pdf': IconFileTypePdf,
  'terminal-2': IconTerminal2,
  settings: IconSettings,
  'list-details': IconListDetails,
};

export function appIcon(id: AppId): Icon {
  return ICONS[appMeta[id].icon] ?? IconFileText;
}

/** AgentOS's own gradient app tile, sized by its container. */
export function AppGlyph({ id, className = '' }: { id: AppId; className?: string }) {
  const Glyph = appIcon(id);
  const [from, to] = appMeta[id].tint;
  return (
    <span
      aria-hidden
      className={`app-glyph ${className}`}
      style={{ backgroundImage: `linear-gradient(150deg, ${from}, ${to})` }}
    >
      <Glyph stroke={1.6} className="app-glyph-icon" />
    </span>
  );
}
