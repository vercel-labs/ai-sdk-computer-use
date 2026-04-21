"use client";

import type { Message } from "ai";
import { useEffect, useMemo, useState } from "react";
import { reconcileAgentEvents } from "@/lib/agent-events/normalize";
import { selectAgentEventDerivedState } from "@/lib/agent-events/selectors";
import type { AgentEvent, ChatRequestStatus } from "@/types/agent-events";

type UseAgentEventsResult = ReturnType<typeof selectAgentEventDerivedState> & {
  events: AgentEvent[];
  selectedEventId: string | null;
  selectEvent: (eventId: string) => void;
};

export function useAgentEvents(
  messages: Message[],
  status: ChatRequestStatus,
  runtimeError?: string | null,
): UseAgentEventsResult {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setEvents([]);
      setSelectedEventId(null);
      return;
    }

    setEvents((previousEvents) =>
      reconcileAgentEvents({
        previousEvents,
        messages,
        status,
        runtimeError,
      }),
    );
  }, [messages, runtimeError, status]);

  const derivedState = useMemo(
    () => selectAgentEventDerivedState(events, selectedEventId),
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEventId) {
      if (derivedState.toolActivities[0]) {
        setSelectedEventId(derivedState.toolActivities[0].callEventId);
      } else if (derivedState.latestEvent) {
        setSelectedEventId(derivedState.latestEvent.id);
      }
      return;
    }

    const selectedStillExists = events.some((event) => event.id === selectedEventId);
    if (!selectedStillExists) {
      setSelectedEventId(derivedState.latestEvent?.id ?? null);
    }
  }, [
    derivedState.latestEvent,
    derivedState.toolActivities,
    events,
    selectedEventId,
  ]);

  return {
    events,
    selectedEventId,
    selectEvent: setSelectedEventId,
    ...derivedState,
  };
}
