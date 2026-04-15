"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight, Bug, Activity } from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { cn } from "@/lib/utils";
import type { EventType, AgentStatus } from "@/lib/events/types";

const statusColors: Record<AgentStatus, string> = {
    idle: "bg-zinc-400",
    running: "bg-emerald-500 animate-pulse",
    error: "bg-red-500",
};

const statusLabels: Record<AgentStatus, string> = {
    idle: "Idle",
    running: "Running",
    error: "Error",
};

const eventTypeLabels: Record<EventType, string> = {
    screenshot: "Screenshots",
    click: "Clicks",
    type: "Typing",
    scroll: "Scrolls",
    bash: "Bash",
    key: "Key Presses",
};

export const DebugPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const events = useEventStore((s) => s.events);
    const eventCounts = useEventStore((s) => s.eventCounts);
    const agentStatus = useEventStore((s) => s.agentStatus);

    const totalEvents = events.length;

    return (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            {/* Toggle Bar */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Bug className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Debug
                    </span>
                    {totalEvents > 0 && (
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 font-mono">
                            {totalEvents}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Agent Status */}
                    <div className="flex items-center gap-1.5">
                        <div
                            className={cn("w-1.5 h-1.5 rounded-full", statusColors[agentStatus])}
                        />
                        <span className="text-[10px] text-zinc-500">
                            {statusLabels[agentStatus]}
                        </span>
                    </div>
                    {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                </div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 space-y-3">
                            {/* Event Counts Table */}
                            <div>
                                <h4 className="text-[10px] uppercase font-semibold text-zinc-400 mb-1.5 tracking-wider">
                                    Event Counts
                                </h4>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(Object.keys(eventCounts) as EventType[]).map((type) => (
                                        <div
                                            key={type}
                                            className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 rounded px-2 py-1"
                                        >
                                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                                {eventTypeLabels[type]}
                                            </span>
                                            <span className="text-[10px] font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                                                {eventCounts[type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Event Log */}
                            <div>
                                <h4 className="text-[10px] uppercase font-semibold text-zinc-400 mb-1.5 tracking-wider">
                                    Event Log
                                </h4>
                                <div className="max-h-48 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                    {events.length === 0 ? (
                                        <div className="flex items-center justify-center py-6 text-zinc-400">
                                            <Activity className="w-4 h-4 mr-1.5 opacity-40" />
                                            <span className="text-[10px]">No events recorded</span>
                                        </div>
                                    ) : (
                                        <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 p-2 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(
                                                events.map((e) => ({
                                                    id: e.id,
                                                    type: e.type,
                                                    status: e.status,
                                                    duration: e.duration,
                                                    timestamp: e.timestamp,
                                                })),
                                                null,
                                                2
                                            )}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
