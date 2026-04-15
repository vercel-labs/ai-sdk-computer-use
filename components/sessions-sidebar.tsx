"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Plus,
    Trash2,
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/sessions/store";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

interface SessionsSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onSessionSwitch: (sessionId: string) => void;
    onNewSession: () => void;
}

export const SessionsSidebar = ({
    isOpen,
    onToggle,
    onSessionSwitch,
    onNewSession,
}: SessionsSidebarProps) => {
    const sessions = useSessionStore((s) => s.sessions);
    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const deleteSession = useSessionStore((s) => s.deleteSession);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (deletingId === sessionId) {
            deleteSession(sessionId);
            setDeletingId(null);
        } else {
            setDeletingId(sessionId);
            // Auto-reset after 3s
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    return (
        <>
            {/* Toggle button (always visible) */}
            <button
                onClick={onToggle}
                className={cn(
                    "fixed top-3 left-3 z-50 p-2 rounded-lg transition-all",
                    "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm"
                )}
                title={isOpen ? "Close sidebar" : "Open sidebar"}
            >
                {isOpen ? (
                    <PanelLeftClose className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                    <PanelLeftOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                )}
            </button>

            {/* Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: -280, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -280, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-[260px] z-40 flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Sessions
                            </h2>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onNewSession}
                                className="h-7 px-2 text-xs"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                New
                            </Button>
                        </div>

                        {/* Session List */}
                        <div className="flex-1 overflow-y-auto py-2 px-2">
                            {sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                                    <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                                    <p className="text-xs">No sessions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {sessions.map((session) => (
                                        <motion.div
                                            key={session.id}
                                            layout
                                            onClick={() => onSessionSwitch(session.id)}
                                            className={cn(
                                                "w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left transition-all group cursor-pointer",
                                                activeSessionId === session.id
                                                    ? "bg-zinc-100 dark:bg-zinc-800"
                                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                            )}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-400" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                    {session.title}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 mt-0.5">
                                                    {formatRelativeTime(session.createdAt)}
                                                    {session.messages.length > 0 && (
                                                        <span className="ml-1.5">
                                                            · {session.messages.length} msgs
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, session.id)}
                                                className={cn(
                                                    "p-1 rounded transition-all shrink-0",
                                                    deletingId === session.id
                                                        ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                                                        : "opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                                                )}
                                                title={
                                                    deletingId === session.id
                                                        ? "Click again to confirm"
                                                        : "Delete session"
                                                }
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onToggle}
                        className="fixed inset-0 bg-black/20 z-30 xl:hidden"
                    />
                )}
            </AnimatePresence>
        </>
    );
};
