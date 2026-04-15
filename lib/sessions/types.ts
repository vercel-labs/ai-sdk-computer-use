import type { UIMessage } from "ai";

export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    messages: UIMessage[];
    sandboxId: string | null;
}

export interface SessionStoreState {
    sessions: ChatSession[];
    activeSessionId: string | null;
}

export interface SessionStoreActions {
    createSession: () => string;
    deleteSession: (id: string) => void;
    switchSession: (id: string) => void;
    updateSessionTitle: (id: string, title: string) => void;
    updateSessionMessages: (id: string, messages: UIMessage[]) => void;
    updateSessionSandboxId: (id: string, sandboxId: string | null) => void;
    getActiveSession: () => ChatSession | undefined;
}

export type SessionStore = SessionStoreState & SessionStoreActions;
