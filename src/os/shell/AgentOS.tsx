'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import type { PortfolioContent } from '@/content/types';
import { useOS } from '../store';
import { isAppId, type AppId } from '../apps/registry';
import { MeApp } from '../apps/MeApp';
import { ExperienceApp } from '../apps/ExperienceApp';
import { ProjectsApp } from '../apps/ProjectsApp';
import { ResumeApp } from '../apps/ResumeApp';
import { ConsultApp } from '../apps/ConsultApp';
import { PensieveApp } from '../apps/PensieveApp';
import { MessagesApp } from '../apps/MessagesApp';
import { SettingsApp } from '../apps/SettingsApp';
import { TerminalApp } from '../apps/TerminalApp';
import { Wallpaper } from './Wallpaper';
import { MenuBar } from './MenuBar';
import { DesktopIcons } from './DesktopIcons';
import { Window } from './Window';
import { Dock } from './Dock';
import { Boot } from './Boot';
import { Lock } from './Lock';
import { initialPhase, type Phase } from './bootFlow';
import { safeStorage } from '@/lib/safeStorage';
import { play, unlockAudio } from '@/sound/sound';
import { useAgent } from '@/agent/agentStore';
import { runAgentPlan } from '@/agent/run';
import { ask, setAskContent, FALLBACK_SUGGESTIONS } from '@/agent/client';
import { memory, DEFAULT_CHIPS } from '@/agent/memory';
import { TOUR } from '@/agent/tour';
import { AgentBar } from '@/agent/ui/AgentBar';
import { AgentLog } from '@/agent/ui/AgentLog';
import { GhostCursor } from '@/agent/ui/GhostCursor';

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
    case 'consult':
      return <ConsultApp />;
    case 'pensieve':
      return <PensieveApp posts={content.posts} />;
    case 'messages':
      return <MessagesApp />;
    case 'settings':
      return <SettingsApp skills={content.about.skills} />;
    case 'terminal':
      return <TerminalApp content={content} />;
    case 'agentlog':
      return <AgentLog />;
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function AgentOS({ content }: { content: PortfolioContent }) {
  const windows = useOS((s) => s.windows);
  const agentStatus = useAgent((s) => s.status);
  const fallback = useAgent((s) => s.fallback);
  // Defaults until mounted: memory lives in localStorage, which SSR cannot read.
  const [memoryChips, setMemoryChips] = useState(DEFAULT_CHIPS);
  // null until mounted: nothing is layered over the desktop during SSR/hydration.
  const [phase, setPhase] = useState<Phase | null>(null);

  // Memory: remember every app that opens, and keep the suggestion chips in step with it.
  useEffect(() => {
    setAskContent(content);
    const refresh = () => setMemoryChips(memory.suggestions());
    const recordOpen = () => useOS.getState().windows.forEach((w) => memory.recordOpen(w.id));
    const offMemory = memory.subscribe(refresh);
    const offOS = useOS.subscribe((s, prev) => {
      if (s.windows !== prev.windows) recordOpen();
    });
    recordOpen();
    refresh();
    return () => {
      offMemory();
      offOS();
    };
  }, [content]);

  useEffect(() => {
    const { setViewport, openApp } = useOS.getState();
    const sync = () => setViewport(window.innerWidth, window.innerHeight);
    sync();
    window.addEventListener('resize', sync);

    const app = new URLSearchParams(window.location.search).get('app');
    const deepLink = isAppId(app);
    if (deepLink) openApp(app);

    const reducedMotion = prefersReducedMotion();
    setPhase(
      initialPhase({
        booted: safeStorage.get('agentos.booted', false),
        reducedMotion,
        deepLink,
      }),
    );

    // Browsers only allow audio after a gesture: unlock on the first one.
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // Development hook for driving the agent from the console.
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as { __agent?: unknown }).__agent = { runAgentPlan, useAgent };
    }

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const onBootDone = useCallback(() => setPhase('lock'), []);
  const onWake = useCallback(() => {
    play('wake');
    setPhase('desktop');
    useOS.getState().openApp('me');
  }, []);
  const onRestart = useCallback(() => setPhase(prefersReducedMotion() ? 'lock' : 'boot'), []);
  const onAsk = useCallback((question: string) => void ask(question), []);
  const onTour = useCallback(() => void runAgentPlan(TOUR), []);

  return (
    // reducedMotion="user": every Motion animation in the shell honours the OS setting.
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 overflow-hidden">
        <Wallpaper thinking={agentStatus === 'thinking'} />
        <DesktopIcons />
        <AnimatePresence>
          {windows.map((w) => (
            <Window key={w.id} id={w.id}>
              {renderApp(w.id, content)}
            </Window>
          ))}
        </AnimatePresence>
        <MenuBar agentStatus={agentStatus === 'idle' ? 'idle' : 'thinking'} onRestart={onRestart} />
        <Dock />
        <AgentBar
          onSubmit={onAsk}
          onTour={onTour}
          suggestions={fallback ? FALLBACK_SUGGESTIONS : memoryChips}
        />
        <GhostCursor />
        {phase === 'boot' && <Boot onDone={onBootDone} />}
        {phase === 'lock' && <Lock onWake={onWake} />}
      </div>
    </MotionConfig>
  );
}
