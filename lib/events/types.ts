export type EventType =
    | "screenshot"
    | "click"
    | "type"
    | "scroll"
    | "bash"
    | "key";

export type EventStatus = "pending" | "success" | "error";

export interface AgentEvent {
    id: string;
    toolCallId: string;
    timestamp: string;
    type: EventType;
    payload: Record<string, unknown>;
    status: EventStatus;
    duration?: number;
    result?: Record<string, unknown>;
}

export type AgentStatus = "idle" | "running" | "error";

export interface EventStoreState {
    events: AgentEvent[];
    eventCounts: Record<EventType, number>;
    agentStatus: AgentStatus;
    selectedEventId: string | null;
}

export interface EventStoreActions {
    addEvent: (event: AgentEvent) => void;
    updateEvent: (id: string, updates: Partial<Omit<AgentEvent, "id">>) => void;
    clearEvents: () => void;
    setAgentStatus: (status: AgentStatus) => void;
    setSelectedEventId: (id: string | null) => void;
}

export type EventStore = EventStoreState & EventStoreActions;
