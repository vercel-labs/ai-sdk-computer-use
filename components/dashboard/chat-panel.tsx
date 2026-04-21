"use client";

import type { Message } from "ai";
import type { RefObject } from "react";
import {
  Bot,
  MessageSquareText,
  Sparkles,
  Workflow,
} from "lucide-react";
import { InlineToolCard } from "@/components/dashboard/inline-tool-card";
import {
  getAgentStatusBadgeProps,
  StatusBadge,
} from "@/components/dashboard/status-badge";
import { PreviewMessage } from "@/components/message";
import { Input } from "@/components/input";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { DeployButton, ProjectInfo } from "@/components/project-info";
import { AISDKLogo } from "@/components/icons";
import { DebugPanel } from "@/components/dashboard/debug-panel";
import type {
  AgentEvent,
  AgentRuntimeStatus,
  EventCountsByType,
  ToolActivity,
} from "@/types/agent-events";

type ChatStatus = "error" | "submitted" | "streaming" | "ready";

type ChatPanelProps = {
  messages: Message[];
  input: string;
  isInitializing: boolean;
  isLoading: boolean;
  status: ChatStatus;
  sandboxId: string | null;
  streamUrl: string | null;
  events: AgentEvent[];
  countsByType: EventCountsByType;
  countsByActionType: Record<string, number>;
  currentAgentStatus: AgentRuntimeStatus;
  latestEvent: AgentEvent | null;
  selectedEventId: string | null;
  selectedEvent: AgentEvent | null;
  toolActivities: ToolActivity[];
  runtimeError: string | null;
  containerRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  onPromptSelect: (prompt: string) => void;
  onSelectEvent: (eventId: string) => void;
};

const summaryCards = [
  {
    title: "Agent Status",
    icon: Sparkles,
  },
  {
    title: "Tool Events",
    icon: Workflow,
  },
] as const;

export function ChatPanel({
  messages,
  input,
  isInitializing,
  isLoading,
  status,
  sandboxId,
  streamUrl,
  events,
  countsByType,
  countsByActionType,
  currentAgentStatus,
  latestEvent,
  selectedEventId,
  selectedEvent,
  toolActivities,
  runtimeError,
  containerRef,
  endRef,
  onInputChange,
  onSubmit,
  onStop,
  onPromptSelect,
  onSelectEvent,
}: ChatPanelProps) {
  const topActionTypes = Object.entries(countsByActionType)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const agentStatusBadge = getAgentStatusBadgeProps(currentAgentStatus);
  const toolWorkspaceEmptyState = (() => {
    if (runtimeError) {
      return "The last request failed before any tool activity was recorded.";
    }

    if (status === "submitted" || status === "streaming") {
      return "The assistant is responding. Tool activity will appear here if it chooses the computer or bash tools.";
    }

    if (messages.length === 0) {
      return "Send a prompt to start a run. Tool activity will populate here as soon as the assistant uses a tool.";
    }

    return "This conversation has not used any tools yet.";
  })();

  return (
    <section className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(249,250,251,0.98))]">
      <div className="border-b border-border/80 bg-background/80 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <AISDKLogo />
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Agent Console
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Chat, inline tool surfaces, and debug controls in one workspace.
              </p>
            </div>
          </div>

          <DeployButton />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="h-full overflow-y-auto" ref={containerRef}>
          <div className="space-y-6 px-5 py-5">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <MessageSquareText className="size-4" />
                Tool Call Workspace
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {summaryCards.map(({ title, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm"
                  >
                    <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-foreground">
                      {title}
                    </h3>
                    {title === "Agent Status" ? (
                      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                        <StatusBadge {...agentStatusBadge} />
                        <p>
                          {runtimeError
                            ? runtimeError
                            : latestEvent
                              ? `Latest event: ${latestEvent.type}`
                              : "No events yet"}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                        <p>
                          {countsByType.tool_call + countsByType.tool_result} tool
                          events tracked
                        </p>
                        <p>
                          {topActionTypes.length > 0
                            ? `Top actions: ${topActionTypes
                                .map(([actionType, count]) => `${actionType} (${count})`)
                                .join(", ")}`
                            : "Actions will appear here once tool activity starts."}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {toolActivities.length > 0 ? (
                  toolActivities.slice(0, 4).map((activity) => (
                    <InlineToolCard
                      key={activity.id}
                      activity={activity}
                      isSelected={
                        selectedEventId === activity.callEventId ||
                        selectedEventId === activity.resultEventId
                      }
                      onSelect={onSelectEvent}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-card/55 p-5 text-sm text-muted-foreground xl:col-span-2">
                    {toolWorkspaceEmptyState}
                  </div>
                )}
              </div>
            </section>

            {messages.length === 0 ? (
              <>
                <ProjectInfo />
                <section className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Quick Start
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use a suggestion to start a run. Conversation history and
                      tool output will continue in this same scrollable workspace.
                    </p>
                  </div>
                  <PromptSuggestions
                    disabled={isInitializing}
                    submitPrompt={onPromptSelect}
                  />
                </section>
              </>
            ) : (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <Bot className="size-4" />
                  Conversation
                </div>
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <PreviewMessage
                      message={message}
                      key={message.id}
                      isLoading={isLoading}
                      status={status}
                      isLatestMessage={index === messages.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {messages.length > 0 && status === "streaming" && toolActivities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                The assistant is streaming a response but has not emitted any tool
                activity yet.
              </div>
            ) : null}
            <div ref={endRef} className="pb-2" />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/80 bg-background/95 backdrop-blur">
        <div className="px-5 pt-4">
          <DebugPanel
            events={events}
            countsByType={countsByType}
            countsByActionType={countsByActionType}
            currentAgentStatus={currentAgentStatus}
            latestEvent={latestEvent}
            selectedEvent={selectedEvent}
            selectedEventId={selectedEventId}
            sandboxId={sandboxId}
            streamUrl={streamUrl}
            status={status}
            runtimeError={runtimeError}
            onSelectEvent={onSelectEvent}
          />
        </div>

        <div className="border-t border-border/80 px-5 py-4">
          <form onSubmit={onSubmit} className="space-y-4">
            {runtimeError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {runtimeError}
              </div>
            ) : null}
            <Input
              handleInputChange={onInputChange}
              input={input}
              isInitializing={isInitializing}
              isLoading={isLoading}
              status={status}
              stop={onStop}
            />
          </form>
        </div>
      </div>
    </section>
  );
}
