export type ChatRequestStatus = "error" | "submitted" | "streaming" | "ready";

export type AgentRuntimeStatus =
  | "idle"
  | "responding"
  | "running_tool"
  | "error";

export type AgentEventStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "completed";

export type AgentEventType =
  | "tool_call"
  | "tool_result"
  | "agent_status"
  | "message_user"
  | "message_agent"
  | "system";

export type EventBase<
  Type extends AgentEventType,
  Payload,
  Status extends AgentEventStatus = AgentEventStatus,
> = {
  id: string;
  timestamp: number;
  type: Type;
  payload: Payload;
  status: Status;
  durationMs?: number;
};

export type MessageUserEvent = EventBase<
  "message_user",
  {
    messageId: string;
    text: string;
    partCount: number;
  },
  "completed"
>;

export type MessageAgentEvent = EventBase<
  "message_agent",
  {
    messageId: string;
    text: string;
    partCount: number;
    toolCallCount: number;
  },
  "running" | "completed"
>;

export type SystemEvent = EventBase<
  "system",
  {
    label: string;
    detail: string;
  },
  "completed" | "error"
>;

export type ToolCallPayload = {
  messageId: string;
  toolCallId: string;
  toolName: string;
  actionType: string;
  preview: string;
  args: Record<string, unknown>;
  step?: number;
};

export type ToolCallEvent = EventBase<
  "tool_call",
  ToolCallPayload,
  "pending" | "running" | "completed"
>;

export type ToolResultPayload = ToolCallPayload & {
  result: unknown;
  resultPreview: string;
};

export type ToolResultEvent = EventBase<
  "tool_result",
  ToolResultPayload,
  "success" | "error" | "completed"
>;

export type AgentStatusEvent = EventBase<
  "agent_status",
  {
    current: AgentRuntimeStatus;
    sourceStatus: ChatRequestStatus;
    detail: string;
  },
  "pending" | "running" | "error" | "completed"
>;

export type AgentEvent =
  | ToolCallEvent
  | ToolResultEvent
  | AgentStatusEvent
  | MessageUserEvent
  | MessageAgentEvent
  | SystemEvent;

export type ToolActivity = {
  id: string;
  toolCallId: string;
  toolName: string;
  actionType: string;
  preview: string;
  args: Record<string, unknown>;
  status: AgentEventStatus;
  timestamp: number;
  durationMs?: number;
  callEventId: string;
  resultEventId?: string;
  messageId: string;
  result?: unknown;
  resultPreview?: string;
};

export type EventCountsByType = Record<AgentEventType, number>;

export type AgentEventDerivedState = {
  countsByType: EventCountsByType;
  countsByActionType: Record<string, number>;
  currentAgentStatus: AgentRuntimeStatus;
  latestEvent: AgentEvent | null;
  latestAgentStatusEvent: AgentStatusEvent | null;
  selectedEvent: AgentEvent | null;
  selectedToolActivity: ToolActivity | null;
  toolActivities: ToolActivity[];
};
