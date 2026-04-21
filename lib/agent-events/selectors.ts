import type {
  AgentEvent,
  AgentEventDerivedState,
  AgentRuntimeStatus,
  EventCountsByType,
  ToolActivity,
} from "@/types/agent-events";

function createEmptyCounts(): EventCountsByType {
  return {
    tool_call: 0,
    tool_result: 0,
    agent_status: 0,
    message_user: 0,
    message_agent: 0,
    system: 0,
  };
}

export function selectToolActivities(events: AgentEvent[]): ToolActivity[] {
  const toolCalls = new Map(
    events
      .filter((event): event is Extract<AgentEvent, { type: "tool_call" }> => {
        return event.type === "tool_call";
      })
      .map((event) => [event.payload.toolCallId, event]),
  );

  const toolResults = new Map(
    events
      .filter((event): event is Extract<AgentEvent, { type: "tool_result" }> => {
        return event.type === "tool_result";
      })
      .map((event) => [event.payload.toolCallId, event]),
  );

  const toolCallIds = new Set<string>([
    ...toolCalls.keys(),
    ...toolResults.keys(),
  ]);

  const activities: ToolActivity[] = [];

  toolCallIds.forEach((toolCallId) => {
    const callEvent = toolCalls.get(toolCallId);
    const resultEvent = toolResults.get(toolCallId);
    const sourceEvent = resultEvent ?? callEvent;

    if (!sourceEvent) {
      return;
    }

    activities.push({
      id: toolCallId,
      toolCallId,
      toolName: sourceEvent.payload.toolName,
      actionType: sourceEvent.payload.actionType,
      preview: sourceEvent.payload.preview,
      args: sourceEvent.payload.args,
      status: resultEvent?.status ?? callEvent?.status ?? "pending",
      timestamp: resultEvent?.timestamp ?? callEvent?.timestamp ?? sourceEvent.timestamp,
      durationMs: resultEvent?.durationMs ?? callEvent?.durationMs,
      callEventId: callEvent?.id ?? `tool-call:${toolCallId}`,
      resultEventId: resultEvent?.id,
      messageId: sourceEvent.payload.messageId,
      result: resultEvent?.payload.result,
      resultPreview: resultEvent?.payload.resultPreview,
    });
  });

  return activities.sort((left, right) => right.timestamp - left.timestamp);
}

export function selectAgentEventDerivedState(
  events: AgentEvent[],
  selectedEventId: string | null,
): AgentEventDerivedState {
  const countsByType = events.reduce((counts, event) => {
    counts[event.type] += 1;
    return counts;
  }, createEmptyCounts());

  const toolActivities = selectToolActivities(events);

  const countsByActionType = toolActivities.reduce<Record<string, number>>(
    (counts, activity) => {
      counts[activity.actionType] = (counts[activity.actionType] ?? 0) + 1;
      return counts;
    },
    {},
  );

  const latestEvent = events.at(-1) ?? null;
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? latestEvent;

  const selectedToolActivity =
    selectedEvent?.type === "tool_call" || selectedEvent?.type === "tool_result"
      ? toolActivities.find(
          (activity) =>
            activity.toolCallId === selectedEvent.payload.toolCallId,
        ) ?? null
      : null;

  const latestAgentStatus = [...events]
    .reverse()
    .find((event): event is Extract<AgentEvent, { type: "agent_status" }> => {
      return event.type === "agent_status";
    });

  return {
    countsByType,
    countsByActionType,
    currentAgentStatus:
      latestAgentStatus?.payload.current ?? ("idle" satisfies AgentRuntimeStatus),
    latestAgentStatusEvent: latestAgentStatus ?? null,
    latestEvent,
    selectedEvent,
    selectedToolActivity,
    toolActivities,
  };
}
