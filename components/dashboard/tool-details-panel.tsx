"use client";

import {
  getToolStatusBadgeProps,
  StatusBadge,
} from "@/components/dashboard/status-badge";
import type { AgentEvent, ToolActivity } from "@/types/agent-events";
import { ScrollText } from "lucide-react";

type ToolDetailsPanelProps = {
  selectedEvent: AgentEvent | null;
  selectedToolActivity: ToolActivity | null;
  runtimeError: string | null;
};

function formatTimestamp(timestamp: number | undefined): string {
  if (timestamp === undefined) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) {
    return "Not available";
  }

  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1_000).toFixed(2)}s`;
}

export function ToolDetailsPanel({
  selectedEvent,
  selectedToolActivity,
  runtimeError,
}: ToolDetailsPanelProps) {
  const imageResult =
    selectedToolActivity?.result &&
    typeof selectedToolActivity.result === "object" &&
    selectedToolActivity.result !== null &&
    "type" in selectedToolActivity.result &&
    selectedToolActivity.result.type === "image" &&
    "data" in selectedToolActivity.result &&
    typeof selectedToolActivity.result.data === "string"
      ? selectedToolActivity.result.data
      : null;
  const selectedStatus = selectedToolActivity?.status ?? selectedEvent?.status;
  const resultCopy = (() => {
    if (!selectedToolActivity) {
      return null;
    }

    if (selectedToolActivity.resultPreview) {
      return selectedToolActivity.resultPreview;
    }

    if (selectedToolActivity.status === "running" || selectedToolActivity.status === "pending") {
      return "This tool call is still running. The result will appear here when it finishes.";
    }

    if (selectedToolActivity.status === "error") {
      return "The tool call failed without a structured result payload.";
    }

    return "No result payload was captured for this tool call.";
  })();

  return (
    <section className="rounded-2xl border border-border/80 bg-card/75 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <ScrollText className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Tool Details
          </h3>
          <p className="text-xs text-muted-foreground">
            Inspect normalized tool and agent events without disrupting the live
            desktop.
          </p>
        </div>
      </div>

      {selectedEvent ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-secondary/50 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Event Type
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {selectedEvent.type}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/50 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </p>
              <div className="mt-2">
                <StatusBadge
                  {...getToolStatusBadgeProps(selectedStatus ?? "completed")}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/50 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Timestamp
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {formatTimestamp(selectedToolActivity?.timestamp ?? selectedEvent.timestamp)}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/50 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Duration
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {formatDuration(selectedToolActivity?.durationMs ?? selectedEvent.durationMs)}
              </p>
            </div>
          </div>

          {selectedToolActivity ? (
            <>
              <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Tool Summary
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Tool
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {selectedToolActivity.toolName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Action
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {selectedToolActivity.actionType}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Preview
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {selectedToolActivity.preview}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Arguments
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-secondary/60 p-3 text-xs text-foreground">
                  {JSON.stringify(selectedToolActivity.args, null, 2)}
                </pre>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Result
                </p>
                <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm text-foreground">
                  {resultCopy}
                </div>
                {imageResult ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border/80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${imageResult}`}
                      alt="Tool result preview"
                      className="h-auto w-full"
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Event Payload
              </p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-secondary/60 p-3 text-xs text-foreground">
                {JSON.stringify(selectedEvent.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-secondary/40 p-4 text-sm text-muted-foreground">
          {runtimeError
            ? `${runtimeError} Select a recorded event to inspect its payload once activity is available.`
            : "Select an event or tool activity to inspect arguments, timing, and results without interrupting the live VNC view."}
        </div>
      )}
    </section>
  );
}
