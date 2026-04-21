"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAgentEvents } from "@/hooks/use-agent-events";
import { getDesktopURL } from "@/lib/sandbox/utils";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ABORTED } from "@/lib/utils";

function getChatErrorPresentation(error: Error): {
  title: string;
  description: string;
} {
  const message = error.message?.trim();

  if (!message) {
    return {
      title: "There was an error",
      description: "Please try again later.",
    };
  }

  if (message.toLowerCase().includes("credit balance is too low")) {
    return {
      title: "Anthropic credits required",
      description: message,
    };
  }

  return {
    title: "Request failed",
    description: message,
  };
}

function shouldSuppressChatErrorLog(error: Error): boolean {
  const message = error.message?.toLowerCase().trim();

  if (!message) {
    return false;
  }

  return message.includes("credit balance is too low");
}

export default function Chat() {
  // Create separate refs for mobile and desktop to ensure both scroll properly
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();

  const [isInitializing, setIsInitializing] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    status,
    stop: stopGeneration,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id: sandboxId ?? undefined,
    body: {
      sandboxId,
    },
    maxSteps: 30,
    onError: (error) => {
      if (!shouldSuppressChatErrorLog(error)) {
        console.error(error);
      }

      const { title, description } = getChatErrorPresentation(error);
      setRuntimeError(description);
      toast.error(title, {
        description,
        richColors: true,
        position: "top-center",
      });
    },
  });

  const stop = () => {
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
  };

  const isLoading = status !== "ready";
  const {
    events,
    countsByType,
    countsByActionType,
    currentAgentStatus,
    latestEvent,
    selectedEventId,
    selectedEvent,
    selectedToolActivity,
    toolActivities,
    selectEvent,
  } = useAgentEvents(messages, status, runtimeError);

  const submitPrompt = useCallback(
    (prompt: string) => {
      setRuntimeError(null);

      // `useChat` already routes failures through `onError`; swallow the
      // returned rejection here to avoid duplicate noisy dev overlays.
      void append({ role: "user", content: prompt }).catch(() => {});
    },
    [append],
  );

  const submitChatForm = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const prompt = input.trim();
      if (!prompt) {
        return;
      }

      setRuntimeError(null);
      setInput("");
      void append({ role: "user", content: prompt }).catch(() => {});
    },
    [append, input, setInput],
  );

  const refreshDesktop = useCallback(async () => {
    try {
      setIsInitializing(true);
      const { streamUrl, id } = await getDesktopURL(sandboxId || undefined);
      setStreamUrl(streamUrl);
      setSandboxId(id);
    } catch (err) {
      console.error("Failed to refresh desktop:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [sandboxId]);

  // Kill desktop on page close
  useEffect(() => {
    if (!sandboxId) return;

    // Function to kill the desktop - just one method to reduce duplicates
    const killDesktop = () => {
      if (!sandboxId) return;

      // Use sendBeacon which is best supported across browsers
      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`,
      );
    };

    // Detect iOS / Safari
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Choose exactly ONE event handler based on the browser
    if (isIOS || isSafari) {
      // For Safari on iOS, use pagehide which is most reliable
      window.addEventListener("pagehide", killDesktop);

      return () => {
        window.removeEventListener("pagehide", killDesktop);
        // Also kill desktop when component unmounts
        killDesktop();
      };
    } else {
      // For all other browsers, use beforeunload
      window.addEventListener("beforeunload", killDesktop);

      return () => {
        window.removeEventListener("beforeunload", killDesktop);
        // Also kill desktop when component unmounts
        killDesktop();
      };
    }
  }, [sandboxId]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming" || status === "ready") {
      setRuntimeError(null);
    }
  }, [status]);

  useEffect(() => {
    const initializeDesktop = async () => {
      try {
        setIsInitializing(true);

        const { streamUrl, id } = await getDesktopURL(undefined);

        setStreamUrl(streamUrl);
        setSandboxId(id);
      } catch (err) {
        console.error("Failed to initialize desktop:", err);
        toast.error("Failed to initialize desktop");
      } finally {
        setIsInitializing(false);
      }
    };

    void initializeDesktop();
  }, []);

  return (
    <DashboardLayout
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
      selectedToolActivity={selectedToolActivity}
      toolActivities={toolActivities}
      runtimeError={runtimeError}
      desktopContainerRef={desktopContainerRef}
      desktopEndRef={desktopEndRef}
      mobileContainerRef={mobileContainerRef}
      mobileEndRef={mobileEndRef}
      onInputChange={handleInputChange}
      onSubmit={submitChatForm}
      onStop={stop}
      onPromptSelect={submitPrompt}
      onRefreshDesktop={refreshDesktop}
      onSelectEvent={selectEvent}
    />
  );
}
