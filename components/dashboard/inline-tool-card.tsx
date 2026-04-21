"use client";

import {
  getToolStatusBadgeProps,
  StatusBadge,
} from "@/components/dashboard/status-badge";
import type { ToolActivity } from "@/types/agent-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollText, Wrench } from "lucide-react";

type InlineToolCardProps = {
  activity: ToolActivity;
  isSelected: boolean;
  onSelect: (eventId: string) => void;
};

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) {
    return "In progress";
  }

  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1_000).toFixed(1)}s`;
}

export function InlineToolCard({
  activity,
  isSelected,
  onSelect,
}: InlineToolCardProps) {
  const targetEventId = activity.resultEventId ?? activity.callEventId;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full justify-start rounded-2xl border p-0 text-left shadow-sm transition-all hover:bg-transparent",
        isSelected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/80 bg-card/75",
      )}
      onClick={() => onSelect(targetEventId)}
    >
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              {activity.toolName === "bash" ? (
                <ScrollText className="size-4" />
              ) : (
                <Wrench className="size-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {activity.toolName}
              </p>
              <p className="text-sm text-muted-foreground">
                {activity.actionType}
              </p>
            </div>
          </div>

          <StatusBadge
            {...getToolStatusBadgeProps(activity.status)}
            className="shrink-0"
          />
        </div>

        <div className="rounded-xl bg-secondary/50 p-3 text-sm text-foreground">
          {activity.preview}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTimestamp(activity.timestamp)}</span>
          <span>{formatDuration(activity.durationMs)}</span>
        </div>
      </div>
    </Button>
  );
}
