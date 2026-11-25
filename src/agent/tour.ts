import type { AgentAction } from './actions';

/** The "Let the agent drive" walkthrough: me, experience, projects (featured first), consult. */
export const TOUR: AgentAction[] = [
  { type: 'open_app', app: 'me' },
  { type: 'say', text: "Let's start with who Waheed is. This is his intro." },
  { type: 'open_app', app: 'experience' },
  { type: 'say', text: "Here's where he has worked and what he did there." },
  { type: 'open_app', app: 'projects' },
  { type: 'say', text: 'And here are his projects, with the featured builds up front.' },
  { type: 'open_app', app: 'consult' },
  {
    type: 'say',
    text: "If you'd like to work with Waheed, this is where to start. That's the tour!",
  },
];
