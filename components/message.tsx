"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { ABORTED, cn } from "@/lib/utils";
import { mapActionToEventType } from "@/lib/events/store";
import { useEventStore } from "@/lib/events/store";
import { ToolCallCard } from "@/components/tool-call-card";
import type { EventStatus } from "@/lib/events/types";

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: Message;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
}) => {
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const setSelectedEventId = useEventStore((s) => s.setSelectedEventId);

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit"
          )}
        >
          <div className="flex flex-col gap-1.5 w-full">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-row gap-2 items-start w-full pb-4"
                    >
                      <div
                        className={cn("flex flex-col gap-4", {
                          "bg-secondary text-secondary-foreground px-3 py-2 rounded-xl":
                            message.role === "user",
                        })}
                      >
                        <Streamdown>{part.text}</Streamdown>
                      </div>
                    </motion.div>
                  );
                case "tool-invocation": {
                  const { toolName, toolCallId, state, args } =
                    part.toolInvocation;

                  // Derive the event type and create a unique event ID
                  const action =
                    toolName === "computer"
                      ? (args as Record<string, unknown>).action as string | undefined
                      : undefined;

                  const eventType = mapActionToEventType(toolName, action);
                  const eventId = `${toolCallId}-${i}`;

                  // Derive status
                  let eventStatus: EventStatus = "pending";
                  if (state === "result") {
                    const result = part.toolInvocation.result;
                    eventStatus =
                      result === ABORTED ? "error" : "success";
                  } else if (state === "call") {
                    eventStatus =
                      isLatestMessage && status !== "ready"
                        ? "pending"
                        : "error";
                  }

                  // Build payload
                  const payload: Record<string, unknown> = { ...args };
                  if (toolName === "computer" && action) {
                    payload.action = action;
                  }


                  // Show screenshot result image separately
                  const toolInv = part.toolInvocation;
                  const showScreenshot =
                    toolInv.state === "result" &&
                    toolName === "computer" &&
                    action === "screenshot" &&
                    typeof toolInv.result === "object" &&
                    toolInv.result !== null &&
                    (toolInv.result as Record<string, unknown>).type === "image";

                  const screenshotData: string | null = showScreenshot
                    ? String((toolInv.result as Record<string, unknown>).data)
                    : null;

                  const showScreenshotPlaceholder =
                    toolInv.state !== "result" && action === "screenshot";

                  return (
                    <div
                      key={`message-${message.id}-part-${i}`}
                      className="mb-2"
                    >
                      <ToolCallCard
                        id={eventId}
                        toolName={toolName}
                        action={action}
                        eventType={eventType}
                        status={eventStatus}
                        payload={payload}
                        isSelected={selectedEventId === eventId}
                        onSelect={(id) => {
                          setSelectedEventId(
                            selectedEventId === id ? null : id
                          );
                        }}
                      />
                      {showScreenshot && screenshotData && (
                        <div className="p-2 mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${String(screenshotData)}`}
                            alt="Screenshot"
                            className="w-full aspect-[1024/768] rounded-md"
                          />
                        </div>
                      )}
                      {showScreenshotPlaceholder && (
                        <div className="w-full aspect-[1024/768] rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse mt-1" />
                      )}
                    </div>
                  );
                }
                default:
                  return null;
              }
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    return true;
  }
);
