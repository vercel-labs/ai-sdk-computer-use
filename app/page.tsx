"use client";

import { PreviewMessage } from "@/components/message";
import { getDesktopURL } from "@/lib/sandbox/utils";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Input } from "@/components/input";
import { toast } from "sonner";
import { DeployButton, ProjectInfo } from "@/components/project-info";
import { AISDKLogo } from "@/components/icons";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ABORTED } from "@/lib/utils";
import { VncViewer } from "@/components/vnc-viewer";
import { ToolCallDetail } from "@/components/tool-call-detail";
import { DebugPanel } from "@/components/debug-panel";
import { SessionsSidebar } from "@/components/sessions-sidebar";
import { useSessionStore } from "@/lib/sessions/store";
import { useEventStore } from "@/lib/events/store";
import { mapActionToEventType } from "@/lib/events/store";
import type { AgentEvent } from "@/lib/events/types";

export default function Chat() {
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();

  const [isInitializing, setIsInitializing] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Session store
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);
  const switchSession = useSessionStore((s) => s.switchSession);
  const updateSessionMessages = useSessionStore(
    (s) => s.updateSessionMessages
  );
  const updateSessionSandboxId = useSessionStore(
    (s) => s.updateSessionSandboxId
  );

  // Event store
  const setAgentStatus = useEventStore((s) => s.setAgentStatus);
  const addEvent = useEventStore((s) => s.addEvent);
  const clearEvents = useEventStore((s) => s.clearEvents);
  const trackedToolCalls = useRef<Set<string>>(new Set());

  // Auto-create initial session
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, [sessions.length, createSession]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop: stopGeneration,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id: activeSessionId ?? undefined,
    body: {
      sandboxId,
    },
    maxSteps: 30,
    initialMessages: [],
    onError: (error) => {
      console.error(error);
      toast.error("There was an error", {
        description: "Please try again later.",
        richColors: true,
        position: "top-center",
      });
    },
  });

  // Load messages from active session when it changes
  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, setMessages]);

  // Sync messages to session store
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      updateSessionMessages(activeSessionId, messages);
    }
  }, [activeSessionId, messages, updateSessionMessages]);

  // Sync agent status based on chat status
  useEffect(() => {
    if (status === "streaming" || status === "submitted") {
      setAgentStatus("running");
    } else if (status === "error") {
      setAgentStatus("error");
    } else {
      setAgentStatus("idle");
    }
  }, [status, setAgentStatus]);

  // Extract tool calls from messages and populate event store
  useEffect(() => {
    messages.forEach((message) => {
      if (message.role !== "assistant") return;
      message.parts?.forEach((part, i) => {
        if (part.type !== "tool-invocation") return;
        const { toolName, toolCallId, state, args } = part.toolInvocation;
        const eventId = `${toolCallId}-${i}`;

        if (!trackedToolCalls.current.has(eventId)) {
          trackedToolCalls.current.add(eventId);
          const action =
            toolName === "computer"
              ? (args as Record<string, unknown>).action as string | undefined
              : undefined;
          const eventType = mapActionToEventType(toolName, action);

          const event: AgentEvent = {
            id: eventId,
            toolCallId,
            timestamp: new Date().toISOString(),
            type: eventType,
            payload: { ...args } as Record<string, unknown>,
            status: state === "result" ? "success" : "pending",
            result:
              state === "result"
                ? (part.toolInvocation.result as Record<string, unknown>)
                : undefined,
          };
          addEvent(event);
        }
      });
    });
  }, [messages, addEvent]);

  const stop = useCallback(() => {
    stopGeneration();

    const lastMessage = messages.at(-1);
    const lastMessageLastPart = lastMessage?.parts.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      lastMessageLastPart?.type === "tool-invocation"
    ) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...lastMessage.parts.slice(0, -1),
            {
              ...lastMessageLastPart,
              toolInvocation: {
                ...lastMessageLastPart.toolInvocation,
                state: "result",
                result: ABORTED,
              },
            },
          ],
        },
      ]);
    }
  }, [messages, stopGeneration, setMessages]);

  const isLoading = status !== "ready";

  const refreshDesktop = useCallback(async () => {
    try {
      setIsInitializing(true);
      const { streamUrl, id } = await getDesktopURL(sandboxId || undefined);
      setStreamUrl(streamUrl);
      setSandboxId(id);
      if (activeSessionId) {
        updateSessionSandboxId(activeSessionId, id);
      }
    } catch (err) {
      console.error("Failed to refresh desktop:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [sandboxId, activeSessionId, updateSessionSandboxId]);

  // Kill desktop on page close
  useEffect(() => {
    if (!sandboxId) return;

    const killDesktop = () => {
      if (!sandboxId) return;
      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`
      );
    };

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
      window.addEventListener("pagehide", killDesktop);
      return () => {
        window.removeEventListener("pagehide", killDesktop);
        killDesktop();
      };
    } else {
      window.addEventListener("beforeunload", killDesktop);
      return () => {
        window.removeEventListener("beforeunload", killDesktop);
        killDesktop();
      };
    }
  }, [sandboxId]);

  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        const { streamUrl, id } = await getDesktopURL(sandboxId ?? undefined);
        setStreamUrl(streamUrl);
        setSandboxId(id);
        if (activeSessionId) {
          updateSessionSandboxId(activeSessionId, id);
        }
      } catch (err) {
        console.error("Failed to initialize desktop:", err);
        toast.error("Failed to initialize desktop");
      } finally {
        setIsInitializing(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewSession = useCallback(() => {
    const newSessionId = createSession();
    clearEvents();
    trackedToolCalls.current.clear();
    // Reset sandbox for new session
    setSandboxId(null);
    setStreamUrl(null);
    setIsInitializing(true);
    // Initialize new desktop
    getDesktopURL(undefined)
      .then(({ streamUrl, id }) => {
        setStreamUrl(streamUrl);
        setSandboxId(id);
        updateSessionSandboxId(newSessionId, id);
      })
      .catch((err) => {
        console.error("Failed to initialize desktop:", err);
        toast.error("Failed to initialize desktop");
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [createSession, clearEvents, updateSessionSandboxId]);

  const handleSessionSwitch = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      // Save current messages before switching
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, messages);
      }
      switchSession(sessionId);
      const targetSession = sessions.find((s) => s.id === sessionId);
      clearEvents();
      trackedToolCalls.current.clear();
      setSidebarOpen(false);
      
      // Load sandbox for the target session
      if (targetSession?.sandboxId) {
        setSandboxId(targetSession.sandboxId);
        setIsInitializing(true);
        getDesktopURL(targetSession.sandboxId)
          .then(({ streamUrl }) => {
            setStreamUrl(streamUrl);
          })
          .catch((err) => {
            console.error("Failed to load desktop:", err);
            toast.error("Failed to load desktop");
          })
          .finally(() => {
            setIsInitializing(false);
          });
      } else {
        // No sandbox for this session, create a new one
        setSandboxId(null);
        setStreamUrl(null);
        setIsInitializing(true);
        getDesktopURL(undefined)
          .then(({ streamUrl, id }) => {
            setStreamUrl(streamUrl);
            setSandboxId(id);
            updateSessionSandboxId(sessionId, id);
          })
          .catch((err) => {
            console.error("Failed to initialize desktop:", err);
            toast.error("Failed to initialize desktop");
          })
          .finally(() => {
            setIsInitializing(false);
          });
      }
    },
    [
      activeSessionId,
      switchSession,
      sessions,
      messages,
      updateSessionMessages,
      clearEvents,
      updateSessionSandboxId,
    ]
  );

  return (
    <div className="flex h-dvh relative">
      {/* Sessions Sidebar */}
      <SessionsSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSessionSwitch={handleSessionSwitch}
        onNewSession={handleNewSession}
      />

      {/* Mobile/tablet banner */}
      <div className="flex items-center justify-center fixed left-1/2 -translate-x-1/2 top-5 shadow-md text-xs mx-auto rounded-lg h-8 w-fit bg-blue-600 text-white px-3 py-2 text-left z-50 xl:hidden">
        <span>Headless mode</span>
      </div>

      {/* Desktop: Resizable Panels */}
      <div className="w-full hidden xl:block">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* LEFT PANEL (40%): Chat + Tool Calls + Debug */}
          <ResizablePanel
            defaultSize={40}
            minSize={25}
            className="flex flex-col border-r border-zinc-200 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="bg-white dark:bg-zinc-950 py-3 px-4 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pl-14">
              <AISDKLogo />
              <DeployButton />
            </div>

            {/* Chat Messages */}
            <div
              className="flex-1 space-y-4 py-4 overflow-y-auto px-2"
              ref={desktopContainerRef}
            >
              {messages.length === 0 ? <ProjectInfo /> : null}
              {messages.map((message, i) => (
                <PreviewMessage
                  message={message}
                  key={message.id}
                  isLoading={isLoading}
                  status={status}
                  isLatestMessage={i === messages.length - 1}
                />
              ))}
              <div ref={desktopEndRef} className="pb-2" />
            </div>

            {messages.length === 0 && (
              <PromptSuggestions
                disabled={isInitializing}
                submitPrompt={(prompt: string) =>
                  append({ role: "user", content: prompt })
                }
              />
            )}

            {/* Input */}
            <div className="bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800">
              <form onSubmit={handleSubmit} className="p-3">
                <Input
                  handleInputChange={handleInputChange}
                  input={input}
                  isInitializing={isInitializing}
                  isLoading={isLoading}
                  status={status}
                  stop={stop}
                />
              </form>
            </div>

            {/* Debug Panel */}
            <DebugPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT PANEL (60%): VNC + Tool Call Details */}
          <ResizablePanel
            defaultSize={60}
            minSize={40}
            className="flex flex-col bg-black"
          >
            {/* VNC Viewer */}
            <div className="flex-1 min-h-0">
              <VncViewer
                streamUrl={streamUrl}
                isInitializing={isInitializing}
                onRefresh={refreshDesktop}
              />
            </div>

            {/* Tool Call Detail Panel */}
            <ToolCallDetail />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile View (Chat Only) */}
      <div className="w-full xl:hidden">
        <div className="flex flex-col h-dvh">
          <div className="bg-white dark:bg-zinc-950 py-4 px-4 flex justify-between items-center pl-14">
            <AISDKLogo />
            <DeployButton />
          </div>

          <div
            className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
            ref={mobileContainerRef}
          >
            {messages.length === 0 ? <ProjectInfo /> : null}
            {messages.map((message, i) => (
              <PreviewMessage
                message={message}
                key={message.id}
                isLoading={isLoading}
                status={status}
                isLatestMessage={i === messages.length - 1}
              />
            ))}
            <div ref={mobileEndRef} className="pb-2" />
          </div>

          {messages.length === 0 && (
            <PromptSuggestions
              disabled={isInitializing}
              submitPrompt={(prompt: string) =>
                append({ role: "user", content: prompt })
              }
            />
          )}
          <div className="bg-white dark:bg-zinc-950">
            <form onSubmit={handleSubmit} className="p-4">
              <Input
                handleInputChange={handleInputChange}
                input={input}
                isInitializing={isInitializing}
                isLoading={isLoading}
                status={status}
                stop={stop}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
