"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
    Camera,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Keyboard,
    KeyRound,
    Loader2,
    MousePointer,
    MousePointerClick,
    ScrollText,
    Terminal,
    Clock,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventType, EventStatus } from "@/lib/events/types";

interface ToolCallCardProps {
    id: string;
    toolName: string;
    action?: string;
    eventType: EventType;
    status: EventStatus;
    duration?: number;
    payload: Record<string, unknown>;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

const eventTypeConfig: Record<
    EventType,
    { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
    screenshot: { icon: Camera, label: "Screenshot" },
    click: { icon: MousePointer, label: "Click" },
    type: { icon: Keyboard, label: "Type" },
    scroll: { icon: ScrollText, label: "Scroll" },
    bash: { icon: Terminal, label: "Bash" },
    key: { icon: KeyRound, label: "Key Press" },
};

const actionIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    screenshot: Camera,
    left_click: MousePointer,
    right_click: MousePointerClick,
    double_click: MousePointerClick,
    mouse_move: MousePointer,
    type: Keyboard,
    key: KeyRound,
    scroll: ScrollText,
    wait: Clock,
    left_click_drag: MousePointer,
};

function getActionLabel(toolName: string, action?: string): string {
    if (toolName === "bash") return "Running command";
    switch (action) {
        case "screenshot":
            return "Taking screenshot";
        case "left_click":
            return "Left clicking";
        case "right_click":
            return "Right clicking";
        case "double_click":
            return "Double clicking";
        case "mouse_move":
            return "Moving mouse";
        case "type":
            return "Typing";
        case "key":
            return "Pressing key";
        case "scroll":
            return "Scrolling";
        case "wait":
            return "Waiting";
        case "left_click_drag":
            return "Dragging";
        default:
            return action || "Action";
    }
}

function getActionDetail(payload: Record<string, unknown>): string {
    const { action, coordinate, text, duration, scroll_amount, scroll_direction, command } =
        payload as {
            action?: string;
            coordinate?: [number, number];
            text?: string;
            duration?: number;
            scroll_amount?: number;
            scroll_direction?: string;
            command?: string;
        };

    if (command) return command.length > 50 ? `${command.slice(0, 50)}...` : command;

    switch (action) {
        case "left_click":
        case "right_click":
        case "double_click":
            return coordinate ? `at (${coordinate[0]}, ${coordinate[1]})` : "";
        case "mouse_move":
            return coordinate ? `to (${coordinate[0]}, ${coordinate[1]})` : "";
        case "type":
            return text ? `"${text.length > 30 ? text.slice(0, 30) + "..." : text}"` : "";
        case "key":
            return text ? `"${text}"` : "";
        case "wait":
            return duration ? `${duration} seconds` : "";
        case "scroll":
            return scroll_direction && scroll_amount
                ? `${scroll_direction} by ${scroll_amount}`
                : "";
        default:
            return "";
    }
}

const statusConfig: Record<
    EventStatus,
    {
        icon: React.ComponentType<{ className?: string; size?: number }>;
        className: string;
        label: string;
    }
> = {
    pending: {
        icon: Loader2,
        className: "text-blue-500 animate-spin",
        label: "Running",
    },
    success: {
        icon: CheckCircle,
        className: "text-emerald-500",
        label: "Success",
    },
    error: {
        icon: XCircle,
        className: "text-red-500",
        label: "Error",
    },
};

export const ToolCallCard = ({
    id,
    toolName,
    action,
    eventType,
    status,
    duration,
    payload,
    isSelected,
    onSelect,
}: ToolCallCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const config = eventTypeConfig[eventType];
    const ActionIcon = action ? (actionIconMap[action] || config.icon) : config.icon;
    const statusInfo = statusConfig[status];
    const StatusIcon = statusInfo.icon;
    const actionLabel = getActionLabel(toolName, action);
    const actionDetail = getActionDetail(payload);

    return (
        <motion.div
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
                "flex flex-col rounded-lg border text-sm transition-all cursor-pointer",
                "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
                "hover:border-zinc-300 dark:hover:border-zinc-700",
                isSelected && "ring-2 ring-blue-500/50 border-blue-300 dark:border-blue-700"
            )}
            onClick={() => onSelect(id)}
        >
            {/* Header */}
            <div className="flex items-center gap-2 p-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    <ActionIcon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 font-medium font-mono text-xs">
                        <span className="truncate">{actionLabel}</span>
                        {actionDetail && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                                {actionDetail}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {duration !== undefined && (
                        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                            {duration}ms
                        </span>
                    )}
                    <div
                        className={cn(
                            "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            status === "pending" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                            status === "success" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
                            status === "error" && "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                        )}
                    >
                        <StatusIcon className={cn("w-3 h-3", statusInfo.className)} size={12} />
                        <span>{statusInfo.label}</span>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Payload */}
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-zinc-200 dark:border-zinc-800 px-2.5 py-2"
                >
                    <pre className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(payload, null, 2)}
                    </pre>
                </motion.div>
            )}
        </motion.div>
    );
};
