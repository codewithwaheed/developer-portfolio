import { appMeta, type AppId } from './registry';
import { AppGlyph } from './icons';

/** Neutral placeholder body; Tasks 5 and 6 replace this with real apps. */
export function AppBody({ id }: { id: AppId }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
      <AppGlyph id={id} className="size-14" />
      <p className="text-sm">{appMeta[id].title}</p>
    </div>
  );
}
