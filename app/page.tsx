"use client";

import { PreviewMessage } from "@/components/message";
import { getDesktopURL } from "@/lib/e2b/utils";
import { getBrowserURL } from "@/lib/kernel/utils";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { Input } from "@/components/input";
import { Button } from "@/components/ui/button";
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

// Provider configuration - defaults to "kernel", can be overridden
const PROVIDER = (process.env.NEXT_PUBLIC_COMPUTER_USE_PROVIDER ||
  "kernel") as "e2b" | "kernel";

export default function Chat() {
  // Create separate refs for mobile and desktop to ensure both scroll properly
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();

  const [isInitializing, setIsInitializing] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);

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
    id: sandboxId ?? undefined,
    body: {
      sandboxId,
      provider: PROVIDER,
    },
    maxSteps: 30,
    onError: (error) => {
      console.error(error);
      toast.error("There was an error", {
        description: "Please try again later.",
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

  const refreshDesktop = async () => {
    try {
      setIsInitializing(true);
      const getURL = PROVIDER === "kernel" ? getBrowserURL : getDesktopURL;
      const { streamUrl, id } = await getURL(sandboxId || undefined);
      // console.log("Refreshed desktop connection with ID:", id);
      setStreamUrl(streamUrl);
      setSandboxId(id);
    } catch (err) {
      console.error("Failed to refresh desktop:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Kill desktop on page close
  useEffect(() => {
    if (!sandboxId) return;

    // Function to kill the desktop - just one method to reduce duplicates
    const killDesktop = () => {
      if (!sandboxId) return;

      // Use sendBeacon which is best supported across browsers
      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}&provider=${PROVIDER}`,
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
    // Initialize desktop and get stream URL when the component mounts
    const init = async () => {
      try {
        setIsInitializing(true);

        // Use the provided ID or create a new one
        const getURL = PROVIDER === "kernel" ? getBrowserURL : getDesktopURL;
        const { streamUrl, id } = await getURL(sandboxId ?? undefined);

        setStreamUrl(streamUrl);
        setSandboxId(id);
      } catch (err) {
        console.error("Failed to initialize:", err);
        toast.error(
          PROVIDER === "kernel"
            ? "Failed to initialize browser"
            : "Failed to initialize desktop",
        );
      } finally {
        setIsInitializing(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-dvh relative">
      {/* Mobile/tablet banner */}
      <div className="flex items-center justify-center fixed left-1/2 -translate-x-1/2 top-5 shadow-md text-xs mx-auto rounded-lg h-8 w-fit bg-blue-600 text-white px-3 py-2 text-left z-50 xl:hidden">
        <span>Headless mode</span>
      </div>

      {/* Resizable Panels */}
      <div className="w-full hidden xl:block">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Desktop Stream Panel */}
          <ResizablePanel
            defaultSize={70}
            minSize={40}
            className="bg-black relative items-center justify-center"
          >
            {streamUrl ? (
              <>
                <iframe
                  src={streamUrl}
                  className="w-full h-full"
                  style={{
                    transformOrigin: "center",
                    width: "100%",
                    height: "100%",
                  }}
                  allow="autoplay"
                />
                <Button
                  onClick={refreshDesktop}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm z-10"
                  disabled={isInitializing}
                >
                  {isInitializing
                    ? PROVIDER === "kernel"
                      ? "Creating browser..."
                      : "Creating desktop..."
                    : PROVIDER === "kernel"
                      ? "New browser"
                      : "New desktop"}
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                {isInitializing
                  ? PROVIDER === "kernel"
                    ? "Initializing browser..."
                    : "Initializing desktop..."
                  : "Loading stream..."}
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat Interface Panel */}
          <ResizablePanel
            defaultSize={30}
            minSize={25}
            className="flex flex-col border-l border-zinc-200"
          >
            <div className="bg-white py-4 px-4 flex justify-between items-center">
              <AISDKLogo />
              <DeployButton />
            </div>

            <div
              className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
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
            <div className="bg-white">
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile View (Chat Only) */}
      <div className="w-full xl:hidden flex flex-col">
        <div className="bg-white py-4 px-4 flex justify-between items-center">
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
        <div className="bg-white">
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
  );
}
