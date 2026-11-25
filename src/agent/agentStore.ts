import { create } from 'zustand';
import type { FitReport } from './actions';

export type AgentStatus = 'idle' | 'thinking' | 'acting';

/** One bubble in the visitor's conversation with the agent (this session only). */
export interface ChatMessage {
  id: number;
  role: 'user' | 'agent';
  text: string;
  /** A job-description fit report rendered as a card under the text. */
  fit?: FitReport;
}

export interface AgentState {
  status: AgentStatus;
  log: string[];
  /** The latest agent reply (also the last agent message in `messages`). */
  reply: string;
  messages: ChatMessage[];
  /** True after the model was unavailable: the bar offers fallback chips. */
  fallback: boolean;
  controller?: AbortController;
}

export interface AgentStoreActions {
  /** Abort any running plan and begin a new one (status: thinking, stale reply cleared). */
  start(): AbortSignal;
  setStatus(status: AgentStatus): void;
  pushLog(line: string): void;
  clearLog(): void;
  /** Show an agent reply: sets `reply` and appends it to the conversation ('' only hides). */
  setReply(text: string, fit?: FitReport): void;
  /** Append the visitor's question to the conversation. */
  pushUser(text: string): void;
  clearChat(): void;
  /** Stop the agent; called on any visitor input outside the agent bar. */
  abort(): void;
}

const initialState = (): AgentState => ({
  status: 'idle',
  log: [],
  reply: '',
  messages: [],
  fallback: false,
});

let nextId = 1;
const MAX_MESSAGES = 40;

export const useAgent = create<AgentState & AgentStoreActions>()((set, get) => ({
  ...initialState(),
  start: () => {
    get().controller?.abort();
    const controller = new AbortController();
    set({ controller, status: 'thinking', reply: '', fallback: false });
    return controller.signal;
  },
  setStatus: (status) => set({ status }),
  pushLog: (line) => set((s) => ({ log: [...s.log, line] })),
  clearLog: () => set({ log: [] }),
  setReply: (reply, fit) =>
    set((s) =>
      reply
        ? {
            reply,
            messages: [
              ...s.messages,
              { id: nextId++, role: 'agent' as const, text: reply, fit },
            ].slice(-MAX_MESSAGES),
          }
        : { reply },
    ),
  pushUser: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: nextId++, role: 'user' as const, text }].slice(-MAX_MESSAGES),
    })),
  clearChat: () => set({ messages: [], reply: '' }),
  abort: () => {
    get().controller?.abort();
    set({ controller: undefined, status: 'idle' });
  },
}));

export function resetAgent(): void {
  useAgent.getState().controller?.abort();
  useAgent.setState({ ...initialState(), controller: undefined });
}
