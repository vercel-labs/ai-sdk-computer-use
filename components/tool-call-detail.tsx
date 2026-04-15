"use client";

import { useEventStore } from "@/lib/events/store";
import { motion, AnimatePresence } from "motion/react";
import {
    Camera,
    Keyboard,
    KeyRound,
    MousePointer,
    ScrollText,
    Terminal,
    X,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventType, EventStatus } from "@/lib/events/types";

const eventTypeIcons: Record<
    EventType,
    React.ComponentType<{ className?: string }>
> = {
    screenshot: Camera,
    click: MousePointer,
    type: Keyboard,
    scroll: ScrollText,
    bash: Terminal,
    key: KeyRound,
};

const eventTypeLabels: Record<EventType, string> = {
    screenshot: "Screenshot",
    click: "Click Action",
    type: "Typing",
    scroll: "Scroll",
    bash: "Bash Command",
    key: "Key Press",
};

const statusConfig: Record<
    EventStatus,
    {
        icon: React.ComponentType<{ className?: string }>;
        label: string;
        bgClass: string;
        textClass: string;
    }
> = {
    pending: {
        icon: Loader2,
        label: "Running",
        bgClass: "bg-blue-50 dark:bg-blue-950",
        textClass: "text-blue-600 dark:text-blue-400",
    },
    success: {
        icon: CheckCircle,
        label: "Completed",
        bgClass: "bg-emerald-50 dark:bg-emerald-950",
        textClass: "text-emerald-600 dark:text-emerald-400",
    },
    error: {
        icon: XCircle,
        label: "Failed",
        bgClass: "bg-red-50 dark:bg-red-950",
        textClass: "text-red-600 dark:text-red-400",
    },
};

export const ToolCallDetail = () => {
    const selectedEventId = useEventStore((s) => s.selectedEventId);
    const events = useEventStore((s) => s.events);
    const setSelectedEventId = useEventStore((s) => s.setSelectedEventId);

    const selectedEvent = events.find((e) => e.id === selectedEventId);

    return (
        <AnimatePresence>
            {selectedEvent ? (
                <motion.div
                    key={selectedEvent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col"
                    style={{ maxHeight: "40%" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                        <div className="flex items-center gap-2">
                            {(() => {
                                const Icon = eventTypeIcons[selectedEvent.type];
                                return <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />;
                            })()}
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                {eventTypeLabels[selectedEvent.type]}
                            </span>

                            {/* Status badge */}
                            {(() => {
                                const config = statusConfig[selectedEvent.status];
                                const StatusIcon = config.icon;
                                return (
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
                                            config.bgClass,
                                            config.textClass
                                        )}
                                    >
                                        <StatusIcon
                                            className={cn(
                                                "w-3 h-3",
                                                selectedEvent.status === "pending" && "animate-spin"
                                            )}
                                        />
                                        {config.label}
                                    </span>
                                );
                            })()}
                        </div>
                        <button
                            onClick={() => setSelectedEventId(null)}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {/* Meta Info */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2.5">
                                <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5">
                                    Timestamp
                                </p>
                                <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                    {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2.5">
                                <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5">
                                    Duration
                                </p>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-zinc-400" />
                                    <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                        {selectedEvent.duration !== undefined
                                            ? `${selectedEvent.duration}ms`
                                            : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payload */}
                        <div>
                            <h4 className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-1.5">
                                Payload
                            </h4>
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                                <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(selectedEvent.payload, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Result */}
                        {selectedEvent.result && (
                            <div>
                                <h4 className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-1.5">
                                    Result
                                </h4>
                                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                                    {selectedEvent.result.type === "image" &&
                                        typeof selectedEvent.result.data === "string" ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={`data:image/png;base64,${selectedEvent.result.data}`}
                                            alt="Screenshot result"
                                            className="w-full rounded-md"
                                        />
                                    ) : (
                                        <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(selectedEvent.result, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            ) : (
                <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-6 flex items-center justify-center">
                    <p className="text-xs text-zinc-400">
                        Click a tool call in the chat to view details
                    </p>
                </div>
            )}
        </AnimatePresence>
    );
};
