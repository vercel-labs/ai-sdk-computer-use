"use client";

import { Button } from "@/components/ui/button";
import {
  getAgentStatusBadgeProps,
  getChatStatusBadgeProps,
  getToolStatusBadgeProps,
  StatusBadge,
} from "@/components/dashboard/status-badge";
import type {
  AgentEvent,
  AgentRuntimeStatus,
  EventCountsByType,
} from "@/types/agent-events";
import { ChevronDown, Bug } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type DebugPanelProps = {
  events: AgentEvent[];
  countsByType: EventCountsByType;
  countsByActionType: Record<string, number>;
  currentAgentStatus: AgentRuntimeStatus;
  latestEvent: AgentEvent | null;
  selectedEvent: AgentEvent | null;
  selectedEventId: string | null;
  sandboxId: string | null;
  streamUrl: string | null;
  status: "error" | "submitted" | "streaming" | "ready";
  runtimeError: string | null;
  onSelectEvent: (eventId: string) => void;
};

type DebugTab = "timeline" | "counts" | "selected";

const debugTabs: Array<{ id: DebugTab; label: string }> = [
  { id: "timeline", label: "Timeline" },
  { id: "counts", label: "Counts" },
  { id: "selected", label: "Selected Event" },
];

export function DebugPanel({
  events,
  countsByType,
  countsByActionType,
  currentAgentStatus,
  latestEvent,
  selectedEvent,
  selectedEventId,
  sandboxId,
  streamUrl,
  status,
  runtimeError,
  onSelectEvent,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DebugTab>("timeline");
  const recentEvents = [...events].reverse().slice(0, 8);
  const topActions = Object.entries(countsByActionType).sort(
    (left, right) => right[1] - left[1],
  );
  const chatStatusBadge = getChatStatusBadgeProps(status);
  const agentStatusBadge = getAgentStatusBadgeProps(currentAgentStatus);
  const timelineEmptyMessage = runtimeError
    ? "The last request failed before a longer event timeline could be recorded."
    : status === "submitted" || status === "streaming"
      ? "Waiting for more runtime activity from the current request."
      : "Event history will appear here once the assistant starts responding.";

  return (
    <section className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur">
      <Button
        type="button"
        variant="ghost"
        className="flex h-auto w-full items-center justify-between rounded-2xl px-4 py-3"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bug className="size-4" />
          Debug Panel
        </span>
        <ChevronDown
          className={cn("size-4 transition-transform", {
            "rotate-180": isOpen,
          })}
        />
      </Button>

      {isOpen ? (
        <div className="flex h-[34dvh] min-h-[280px] max-h-[40dvh] flex-col border-t border-border/80 px-4 py-3 text-sm text-muted-foreground">
          <dl className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Chat Status
              </dt>
              <dd className="mt-2">
                <StatusBadge {...chatStatusBadge} />
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Agent
              </dt>
              <dd className="mt-2">
                <StatusBadge {...agentStatusBadge} />
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Sandbox
              </dt>
              <dd className="mt-1 truncate font-mono text-foreground">
                {sandboxId ?? "Not initialized"}
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Stream
              </dt>
              <dd className="mt-1 truncate font-mono text-foreground">
                {streamUrl ? "Connected" : "Pending"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2 border-b border-border/80 pb-3">
            {debugTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/80 bg-background text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {activeTab === "timeline" ? (
              <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Event Timeline
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {events.length} total
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event.id)}
                        className={cn(
                          "flex w-full items-start justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                          selectedEventId === event.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/80 bg-card hover:bg-secondary/60",
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground">{event.type}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                            }).format(event.timestamp)}
                          </p>
                        </div>
                        <StatusBadge
                          {...getToolStatusBadgeProps(event.status)}
                          className="min-w-[92px] justify-center"
                        />
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 p-3 text-xs">
                      {timelineEmptyMessage}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "counts" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Counts By Type
                  </h4>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {Object.entries(countsByType).map(([type, count]) => (
                      <div key={type} className="rounded-xl bg-secondary/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {type}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {count}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Action Mix
                  </h4>
                  <div className="mt-3 space-y-2">
                    {topActions.length > 0 ? (
                      topActions.slice(0, 6).map(([actionType, count]) => (
                        <div
                          key={actionType}
                          className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2"
                        >
                          <span className="font-mono text-xs text-foreground">
                            {actionType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {count}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/80 p-3 text-xs">
                        No tool actions recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "selected" ? (
              <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Selected Event
                </h4>
                <div className="mt-3 rounded-xl bg-secondary/60 p-3">
                  <p className="font-medium text-foreground">
                    {selectedEvent?.type ?? "No event selected"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {runtimeError
                      ? runtimeError
                      : latestEvent
                        ? `Latest event: ${latestEvent.type}`
                        : "Waiting for activity"}
                  </p>
                  {selectedEvent ? (
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-foreground">
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-border/80 p-3 text-xs">
                      Pick an event from the timeline or tool workspace to inspect its payload here.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
