import { create } from "zustand";
import type {
    AgentEvent,
    AgentStatus,
    EventStore,
    EventType,
} from "./types";

const initialCounts: Record<EventType, number> = {
    screenshot: 0,
    click: 0,
    type: 0,
    scroll: 0,
    bash: 0,
    key: 0,
};

export const useEventStore = create<EventStore>((set) => ({
    events: [],
    eventCounts: { ...initialCounts },
    agentStatus: "idle",
    selectedEventId: null,

    addEvent: (event: AgentEvent) => {
        set((state) => {
            const newCounts = { ...state.eventCounts };
            newCounts[event.type] = (newCounts[event.type] || 0) + 1;
            return {
                events: [...state.events, event],
                eventCounts: newCounts,
            };
        });
    },

    updateEvent: (id: string, updates: Partial<Omit<AgentEvent, "id">>) => {
        set((state) => ({
            events: state.events.map((event) =>
                event.id === id ? { ...event, ...updates } : event
            ),
        }));
    },

    clearEvents: () => {
        set({
            events: [],
            eventCounts: { ...initialCounts },
            selectedEventId: null,
        });
    },

    setAgentStatus: (status: AgentStatus) => {
        set({ agentStatus: status });
    },

    setSelectedEventId: (id: string | null) => {
        set({ selectedEventId: id });
    },
}));

/**
 * Maps an AI SDK computer tool action to our EventType.
 */
export function mapActionToEventType(
    toolName: string,
    action?: string
): EventType {
    if (toolName === "bash") return "bash";

    switch (action) {
        case "screenshot":
            return "screenshot";
        case "left_click":
        case "right_click":
        case "double_click":
        case "mouse_move":
        case "left_click_drag":
            return "click";
        case "type":
            return "type";
        case "key":
            return "key";
        case "scroll":
            return "scroll";
        default:
            return "click";
    }
}
