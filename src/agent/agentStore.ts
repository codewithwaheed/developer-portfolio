import { create } from 'zustand';

export type AgentStatus = 'idle' | 'thinking' | 'acting';

export interface AgentState {
  status: AgentStatus;
  log: string[];
  reply: string;
  /** True after the model was unavailable: the bar offers fallback chips. */
  fallback: boolean;
  controller?: AbortController;
}

export interface AgentStoreActions {
  /** Abort any running plan and begin a new one (status: thinking). */
  start(): AbortSignal;
  setStatus(status: AgentStatus): void;
  pushLog(line: string): void;
  clearLog(): void;
  setReply(text: string): void;
  /** Stop the agent; called on any visitor input outside the agent bar. */
  abort(): void;
}

const initialState = (): AgentState => ({ status: 'idle', log: [], reply: '', fallback: false });

export const useAgent = create<AgentState & AgentStoreActions>()((set, get) => ({
  ...initialState(),
  start: () => {
    get().controller?.abort();
    const controller = new AbortController();
    set({ controller, status: 'thinking', fallback: false });
    return controller.signal;
  },
  setStatus: (status) => set({ status }),
  pushLog: (line) => set((s) => ({ log: [...s.log, line] })),
  clearLog: () => set({ log: [] }),
  setReply: (reply) => set({ reply }),
  abort: () => {
    get().controller?.abort();
    set({ controller: undefined, status: 'idle' });
  },
}));

export function resetAgent(): void {
  useAgent.getState().controller?.abort();
  useAgent.setState({ ...initialState(), controller: undefined });
}
