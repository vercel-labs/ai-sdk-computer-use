import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatSession, SessionStore } from "./types";
import type { UIMessage } from "ai";

function generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useSessionStore = create<SessionStore>()(
    persist(
        (set, get) => ({
            sessions: [],
            activeSessionId: null,

            createSession: () => {
                const id = generateId();
                const newSession: ChatSession = {
                    id,
                    title: `Session ${get().sessions.length + 1}`,
                    createdAt: new Date().toISOString(),
                    messages: [],
                    sandboxId: null,
                };
                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    activeSessionId: id,
                }));
                return id;
            },

            deleteSession: (id: string) => {
                set((state) => {
                    const filtered = state.sessions.filter((s) => s.id !== id);
                    const newActiveId =
                        state.activeSessionId === id
                            ? filtered[0]?.id ?? null
                            : state.activeSessionId;
                    return {
                        sessions: filtered,
                        activeSessionId: newActiveId,
                    };
                });
            },

            switchSession: (id: string) => {
                set({ activeSessionId: id });
            },

            updateSessionTitle: (id: string, title: string) => {
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === id ? { ...s, title } : s
                    ),
                }));
            },

            updateSessionMessages: (id: string, messages: UIMessage[]) => {
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === id ? { ...s, messages } : s
                    ),
                }));
            },

            updateSessionSandboxId: (id: string, sandboxId: string | null) => {
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === id ? { ...s, sandboxId } : s
                    ),
                }));
            },

            getActiveSession: () => {
                const state = get();
                return state.sessions.find((s) => s.id === state.activeSessionId);
            },
        }),
        {
            name: "agent-dashboard-sessions",
            partialize: (state) => ({
                sessions: state.sessions.map((s) => ({
                    ...s,
                    // Only persist last 50 messages per session to avoid localStorage quota
                    messages: s.messages.slice(-50),
                })),
                activeSessionId: state.activeSessionId,
            }),
        }
    )
);
