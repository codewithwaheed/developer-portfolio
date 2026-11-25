'use client';

import { useEffect } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import type { PortfolioContent } from '@/content/types';
import { useOS } from '../store';
import { isAppId, type AppId } from '../apps/registry';
import { AppBody } from '../apps/AppBody';
import { Wallpaper } from './Wallpaper';
import { MenuBar } from './MenuBar';
import { DesktopIcons } from './DesktopIcons';
import { Window } from './Window';
import { Dock } from './Dock';

// Placeholder bodies until Tasks 5 and 6 add the real apps, which read `content`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renderApp(id: AppId, content: PortfolioContent) {
  return <AppBody id={id} />;
}

export function AgentOS({ content }: { content: PortfolioContent }) {
  const windows = useOS((s) => s.windows);

  useEffect(() => {
    const { setViewport, openApp } = useOS.getState();
    const sync = () => setViewport(window.innerWidth, window.innerHeight);
    sync();
    window.addEventListener('resize', sync);

    const app = new URLSearchParams(window.location.search).get('app');
    if (isAppId(app)) openApp(app);

    return () => window.removeEventListener('resize', sync);
  }, []);

  return (
    // reducedMotion="user": every Motion animation in the shell honours the OS setting.
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 overflow-hidden">
        <Wallpaper />
        <DesktopIcons />
        <AnimatePresence>
          {windows.map((w) => (
            <Window key={w.id} id={w.id}>
              {renderApp(w.id, content)}
            </Window>
          ))}
        </AnimatePresence>
        <MenuBar />
        <Dock />
      </div>
    </MotionConfig>
  );
}
