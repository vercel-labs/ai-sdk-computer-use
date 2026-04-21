"use client";

import type { Message } from "ai";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import type {
  AgentEvent,
  AgentRuntimeStatus,
  EventCountsByType,
  ToolActivity,
} from "@/types/agent-events";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { PanelResizer } from "@/components/dashboard/panel-resizer";
import { VncPanel } from "@/components/dashboard/vnc-panel";

type ChatStatus = "error" | "submitted" | "streaming" | "ready";

type DashboardLayoutProps = {
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
  selectedToolActivity: ToolActivity | null;
  toolActivities: ToolActivity[];
  runtimeError: string | null;
  desktopContainerRef: RefObject<HTMLDivElement | null>;
  desktopEndRef: RefObject<HTMLDivElement | null>;
  mobileContainerRef: RefObject<HTMLDivElement | null>;
  mobileEndRef: RefObject<HTMLDivElement | null>;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  onPromptSelect: (prompt: string) => void;
  onRefreshDesktop: () => void;
  onSelectEvent: (eventId: string) => void;
};

export function DashboardLayout({
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
  selectedToolActivity,
  toolActivities,
  runtimeError,
  desktopContainerRef,
  desktopEndRef,
  mobileContainerRef,
  mobileEndRef,
  onInputChange,
  onSubmit,
  onStop,
  onPromptSelect,
  onRefreshDesktop,
  onSelectEvent,
}: DashboardLayoutProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateMatch = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, []);

  return (
    <div className="relative flex h-dvh bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2f8_100%)]">
      {isDesktop ? (
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel defaultSize={44} minSize={30}>
            <ChatPanel
              messages={messages}
              input={input}
              isInitializing={isInitializing}
              isLoading={isLoading}
              status={status}
              sandboxId={sandboxId}
              streamUrl={streamUrl}
              events={events}
              countsByType={countsByType}
              countsByActionType={countsByActionType}
              currentAgentStatus={currentAgentStatus}
              latestEvent={latestEvent}
              selectedEventId={selectedEventId}
              selectedEvent={selectedEvent}
              toolActivities={toolActivities}
              runtimeError={runtimeError}
              containerRef={desktopContainerRef}
              endRef={desktopEndRef}
              onInputChange={onInputChange}
              onSubmit={onSubmit}
              onStop={onStop}
              onPromptSelect={onPromptSelect}
              onSelectEvent={onSelectEvent}
            />
          </ResizablePanel>

          <PanelResizer />

          <ResizablePanel defaultSize={56} minSize={34}>
            <VncPanel
              isInitializing={isInitializing}
              streamUrl={streamUrl}
              onRefresh={onRefreshDesktop}
              selectedEvent={selectedEvent}
              selectedToolActivity={selectedToolActivity}
              runtimeError={runtimeError}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex h-full w-full flex-col">
          <div className="h-[42dvh] min-h-[320px] border-b border-border/80">
            <VncPanel
              isInitializing={isInitializing}
              streamUrl={streamUrl}
              onRefresh={onRefreshDesktop}
              selectedEvent={selectedEvent}
              selectedToolActivity={selectedToolActivity}
              runtimeError={runtimeError}
            />
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel
              messages={messages}
              input={input}
              isInitializing={isInitializing}
              isLoading={isLoading}
              status={status}
              sandboxId={sandboxId}
              streamUrl={streamUrl}
              events={events}
              countsByType={countsByType}
              countsByActionType={countsByActionType}
              currentAgentStatus={currentAgentStatus}
              latestEvent={latestEvent}
              selectedEventId={selectedEventId}
              selectedEvent={selectedEvent}
              toolActivities={toolActivities}
              runtimeError={runtimeError}
              containerRef={mobileContainerRef}
              endRef={mobileEndRef}
              onInputChange={onInputChange}
              onSubmit={onSubmit}
              onStop={onStop}
              onPromptSelect={onPromptSelect}
              onSelectEvent={onSelectEvent}
            />
          </div>
        </div>
      )}
    </div>
  );
}
