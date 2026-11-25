'use client';

import { useEffect } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import type { PortfolioContent } from '@/content/types';
import { useOS } from '../store';
import { isAppId, type AppId } from '../apps/registry';
import { AppBody } from '../apps/AppBody';
import { MeApp } from '../apps/MeApp';
import { ExperienceApp } from '../apps/ExperienceApp';
import { ProjectsApp } from '../apps/ProjectsApp';
import { ResumeApp } from '../apps/ResumeApp';
import { Wallpaper } from './Wallpaper';
import { MenuBar } from './MenuBar';
import { DesktopIcons } from './DesktopIcons';
import { Window } from './Window';
import { Dock } from './Dock';

// Apps not yet built (Tasks 6+) fall back to the placeholder body.
function renderApp(id: AppId, content: PortfolioContent) {
  switch (id) {
    case 'me':
      return <MeApp about={content.about} />;
    case 'experience':
      return <ExperienceApp jobs={content.jobs} />;
    case 'projects':
      return <ProjectsApp projects={content.projects} />;
    case 'resume':
      return <ResumeApp />;
    default:
      return <AppBody id={id} />;
  }
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
