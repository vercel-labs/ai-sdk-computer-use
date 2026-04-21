import type { Message, ToolInvocation } from "ai";
import { ABORTED } from "@/lib/utils";
import type {
  AgentEvent,
  AgentEventStatus,
  AgentRuntimeStatus,
  ChatRequestStatus,
  MessageAgentEvent,
  MessageUserEvent,
  SystemEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "@/types/agent-events";

type SnapshotEvent =
  | MessageUserEvent
  | MessageAgentEvent
  | SystemEvent
  | ToolCallEvent
  | ToolResultEvent;

type SnapshotState = {
  runtimeStatus: AgentRuntimeStatus;
  runtimeDetail: string;
  events: SnapshotEvent[];
};

type ReconcileInput = {
  previousEvents: AgentEvent[];
  messages: Message[];
  status: ChatRequestStatus;
  runtimeError?: string | null;
  now?: number;
};

const FALLBACK_EVENT_GAP_MS = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTimestamp(createdAt: Date | undefined, index: number): number {
  return createdAt?.getTime() ?? (index + 1) * FALLBACK_EVENT_GAP_MS;
}

function sanitizeArgs(args: unknown): Record<string, unknown> {
  if (!isRecord(args)) {
    return {};
  }

  return args;
}

function getComputerPreview(args: Record<string, unknown>): string {
  const action = typeof args.action === "string" ? args.action : "computer";
  const text = typeof args.text === "string" ? args.text : undefined;
  const coordinate = Array.isArray(args.coordinate) ? args.coordinate : undefined;

  if (text) {
    return `${action}: ${text.slice(0, 48)}`;
  }

  if (
    coordinate &&
    coordinate.length === 2 &&
    typeof coordinate[0] === "number" &&
    typeof coordinate[1] === "number"
  ) {
    return `${action} @ ${coordinate[0]}, ${coordinate[1]}`;
  }

  return action;
}

function getPreviewForTool(
  toolName: string,
  args: Record<string, unknown>,
): { actionType: string; preview: string } {
  if (toolName === "computer") {
    return {
      actionType: typeof args.action === "string" ? args.action : "computer",
      preview: getComputerPreview(args),
    };
  }

  if (toolName === "bash") {
    const command = typeof args.command === "string" ? args.command : "bash";
    return {
      actionType: "bash",
      preview:
        command.length > 56 ? `${command.slice(0, 56).trimEnd()}...` : command,
    };
  }

  return {
    actionType: toolName,
    preview: `${toolName} invocation`,
  };
}

function previewUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120).trimEnd()}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return "No result";
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isRecord(value)) {
    if (typeof value.text === "string") {
      return previewUnknown(value.text);
    }

    if (typeof value.type === "string" && value.type === "image") {
      return "Image result";
    }

    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 120
        ? `${serialized.slice(0, 120).trimEnd()}...`
        : serialized;
    } catch {
      return "Structured result";
    }
  }

  return "Unsupported result";
}

function inferToolResultStatus(result: unknown): ToolResultEvent["status"] {
  if (result === ABORTED) {
    return "completed";
  }

  if (typeof result === "string") {
    return result.toLowerCase().startsWith("error") ? "error" : "success";
  }

  if (isRecord(result) && typeof result.text === "string") {
    return result.text.toLowerCase().startsWith("error") ? "error" : "success";
  }

  return "success";
}

function inferRuntimeStatus(
  snapshotEvents: SnapshotEvent[],
  status: ChatRequestStatus,
  runtimeError?: string | null,
): { runtimeStatus: AgentRuntimeStatus; runtimeDetail: string } {
  const runningTool = snapshotEvents.some(
    (event) => event.type === "tool_call" && event.status === "running",
  );

  if (status === "error") {
    return {
      runtimeStatus: "error",
      runtimeDetail: runtimeError?.trim() || "Last request failed",
    };
  }

  if (runningTool) {
    return {
      runtimeStatus: "running_tool",
      runtimeDetail: "Executing tool actions",
    };
  }

  if (status === "streaming" || status === "submitted") {
    return {
      runtimeStatus: "responding",
      runtimeDetail: "Generating assistant response",
    };
  }

  return {
    runtimeStatus: "idle",
    runtimeDetail: "Awaiting next instruction",
  };
}

function normalizeToolInvocation(
  invocation: ToolInvocation,
  messageId: string,
  timestamp: number,
): ToolCallEvent | ToolResultEvent {
  const args = sanitizeArgs(invocation.args);
  const { actionType, preview } = getPreviewForTool(invocation.toolName, args);

  const basePayload = {
    messageId,
    toolCallId: invocation.toolCallId,
    toolName: invocation.toolName,
    actionType,
    preview,
    args,
    step: invocation.step,
  };

  if (invocation.state === "result") {
    return {
      id: `tool-result:${invocation.toolCallId}`,
      timestamp,
      type: "tool_result",
      status: inferToolResultStatus(invocation.result),
      payload: {
        ...basePayload,
        result: invocation.result,
        resultPreview: previewUnknown(invocation.result),
      },
    };
  }

  return {
    id: `tool-call:${invocation.toolCallId}`,
    timestamp,
    type: "tool_call",
    status: invocation.state === "partial-call" ? "pending" : "running",
    payload: basePayload,
  };
}

function getMessageText(message: Message): string {
  if (typeof message.content === "string" && message.content.trim().length > 0) {
    return message.content;
  }

  const textParts = message.parts
    ?.filter((part): part is Extract<typeof part, { type: "text" }> => {
      return part.type === "text";
    })
    .map((part) => part.text.trim())
    .filter(Boolean);

  return textParts?.join("\n") ?? "";
}

function normalizeSnapshot(
  messages: Message[],
  status: ChatRequestStatus,
  runtimeError?: string | null,
): SnapshotState {
  const snapshotEvents: SnapshotEvent[] = [];

  messages.forEach((message, index) => {
    const timestamp = normalizeTimestamp(message.createdAt, index);
    const text = getMessageText(message);
    const partCount = message.parts?.length ?? 0;

    if (message.role === "user") {
      snapshotEvents.push({
        id: `message-user:${message.id}`,
        timestamp,
        type: "message_user",
        status: "completed",
        payload: {
          messageId: message.id,
          text,
          partCount,
        },
      });
    }

    if (message.role === "assistant") {
      const toolCallCount =
        message.parts?.filter((part) => part.type === "tool-invocation").length ?? 0;

      snapshotEvents.push({
        id: `message-agent:${message.id}`,
        timestamp,
        type: "message_agent",
        status:
          index === messages.length - 1 && (status === "streaming" || status === "submitted")
            ? "running"
            : "completed",
        payload: {
          messageId: message.id,
          text,
          partCount,
          toolCallCount,
        },
      });
    }

    if (message.role === "system") {
      snapshotEvents.push({
        id: `system:${message.id}`,
        timestamp,
        type: "system",
        status: "completed",
        payload: {
          label: "System message",
          detail: text,
        },
      });
    }

    message.parts?.forEach((part) => {
      if (part.type !== "tool-invocation") {
        return;
      }

      snapshotEvents.push(
        normalizeToolInvocation(part.toolInvocation, message.id, timestamp),
      );
    });
  });

  if (runtimeError?.trim()) {
    snapshotEvents.push({
      id: "system:chat-error",
      timestamp: Date.now(),
      type: "system",
      status: "error",
      payload: {
        label: "Chat error",
        detail: runtimeError.trim(),
      },
    });
  }

  const { runtimeStatus, runtimeDetail } = inferRuntimeStatus(
    snapshotEvents,
    status,
    runtimeError,
  );

  return {
    runtimeStatus,
    runtimeDetail,
    events: snapshotEvents,
  };
}

function mergeEvent(
  existing: AgentEvent | undefined,
  nextEvent: SnapshotEvent,
  now: number,
): AgentEvent {
  if (!existing) {
    return {
      ...nextEvent,
      timestamp:
        nextEvent.type === "tool_call" || nextEvent.type === "tool_result"
          ? now
          : nextEvent.timestamp || now,
    };
  }

  if (existing.type !== nextEvent.type) {
    return nextEvent;
  }

  const timestamp = existing.timestamp || nextEvent.timestamp || now;
  const durationMs =
    nextEvent.type === "tool_result" || nextEvent.type === "tool_call"
      ? existing.durationMs
      : nextEvent.durationMs;

  return {
    ...existing,
    ...nextEvent,
    timestamp,
    durationMs,
  };
}

function maybeCompleteToolCallEvent(
  event: AgentEvent,
  resultEvent: ToolResultEvent,
): AgentEvent {
  if (event.type !== "tool_call") {
    return event;
  }

  if (event.payload.toolCallId !== resultEvent.payload.toolCallId) {
    return event;
  }

  return {
    ...event,
    status: "completed",
    durationMs: resultEvent.timestamp - event.timestamp,
  };
}

export function reconcileAgentEvents({
  previousEvents,
  messages,
  status,
  runtimeError,
  now = Date.now(),
}: ReconcileInput): AgentEvent[] {
  const snapshot = normalizeSnapshot(messages, status, runtimeError);
  const existingEvents = new Map(previousEvents.map((event) => [event.id, event]));
  const nextEvents = [...previousEvents];

  snapshot.events.forEach((event) => {
    const existing = existingEvents.get(event.id);
    const merged = mergeEvent(existing, event, now);

    if (!existing) {
      nextEvents.push(merged);
      existingEvents.set(merged.id, merged);
      return;
    }

    const index = nextEvents.findIndex((item) => item.id === merged.id);
    nextEvents[index] = merged;
    existingEvents.set(merged.id, merged);
  });

  const statusEventId = `agent-status:${snapshot.runtimeStatus}`;
  const previousStatusEvent = [...nextEvents]
    .reverse()
    .find((event): event is Extract<AgentEvent, { type: "agent_status" }> => {
      return event.type === "agent_status";
    });

  if (previousStatusEvent?.payload.current !== snapshot.runtimeStatus) {
    nextEvents.push({
      id: `${statusEventId}:${now}`,
      timestamp: now,
      type: "agent_status",
      status:
        snapshot.runtimeStatus === "error"
          ? "error"
          : snapshot.runtimeStatus === "idle"
            ? "completed"
            : "running",
      payload: {
        current: snapshot.runtimeStatus,
        sourceStatus: status,
        detail: snapshot.runtimeDetail,
      },
    });
  } else if (!previousStatusEvent) {
    nextEvents.push({
      id: `${statusEventId}:${now}`,
      timestamp: now,
      type: "agent_status",
      status:
        snapshot.runtimeStatus === "idle"
          ? "completed"
          : snapshot.runtimeStatus === "error"
            ? "error"
            : "running",
      payload: {
        current: snapshot.runtimeStatus,
        sourceStatus: status,
        detail: snapshot.runtimeDetail,
      },
    });
  }

  const resultEvents = nextEvents.filter(
    (event): event is ToolResultEvent => event.type === "tool_result",
  );

  resultEvents.forEach((resultEvent) => {
    const callEventId = `tool-call:${resultEvent.payload.toolCallId}`;
    const callEventIndex = nextEvents.findIndex((event) => event.id === callEventId);

    if (callEventIndex >= 0) {
      nextEvents[callEventIndex] = maybeCompleteToolCallEvent(
        nextEvents[callEventIndex],
        resultEvent,
      );
      return;
    }

    nextEvents.push({
      id: callEventId,
      timestamp: resultEvent.timestamp,
      type: "tool_call",
      status: "completed",
      durationMs: 0,
      payload: {
        messageId: resultEvent.payload.messageId,
        toolCallId: resultEvent.payload.toolCallId,
        toolName: resultEvent.payload.toolName,
        actionType: resultEvent.payload.actionType,
        preview: resultEvent.payload.preview,
        args: resultEvent.payload.args,
        step: resultEvent.payload.step,
      },
    });
  });

  nextEvents.sort((left, right) => left.timestamp - right.timestamp);

  return nextEvents;
}
