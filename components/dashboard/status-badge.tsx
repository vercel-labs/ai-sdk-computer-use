"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Loader2,
  type LucideIcon,
  Sparkles,
  Wrench,
} from "lucide-react";
import type {
  AgentEventStatus,
  AgentRuntimeStatus,
  ChatRequestStatus,
} from "@/types/agent-events";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

type StatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  spinning?: boolean;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
  spinning = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn("size-3.5", {
            "animate-spin": spinning,
          })}
        />
      ) : null}
      {label}
    </span>
  );
}

export function getToolStatusBadgeProps(status: AgentEventStatus) {
  switch (status) {
    case "pending":
      return { label: "Pending", tone: "warning", icon: Sparkles } as const;
    case "running":
      return { label: "Running", tone: "info", icon: Loader2, spinning: true } as const;
    case "success":
      return { label: "Success", tone: "success", icon: CheckCircle2 } as const;
    case "error":
      return { label: "Error", tone: "danger", icon: AlertTriangle } as const;
    case "completed":
      return { label: "Completed", tone: "neutral", icon: CircleSlash } as const;
  }
}

export function getAgentStatusBadgeProps(status: AgentRuntimeStatus) {
  switch (status) {
    case "idle":
      return { label: "Idle", tone: "neutral", icon: Sparkles } as const;
    case "responding":
      return { label: "Responding", tone: "info", icon: Loader2, spinning: true } as const;
    case "running_tool":
      return { label: "Running tool", tone: "warning", icon: Wrench } as const;
    case "error":
      return { label: "Error", tone: "danger", icon: AlertTriangle } as const;
  }
}

export function getChatStatusBadgeProps(status: ChatRequestStatus) {
  switch (status) {
    case "ready":
      return { label: "Ready", tone: "neutral", icon: Sparkles } as const;
    case "submitted":
      return { label: "Submitted", tone: "info", icon: Loader2, spinning: true } as const;
    case "streaming":
      return { label: "Streaming", tone: "info", icon: Loader2, spinning: true } as const;
    case "error":
      return { label: "Error", tone: "danger", icon: AlertTriangle } as const;
  }
}
