"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";

interface VncViewerProps {
    streamUrl: string | null;
    isInitializing: boolean;
    onRefresh: () => void;
}

const PureVncViewer = ({
    streamUrl,
    isInitializing,
    onRefresh,
}: VncViewerProps) => {
    return (
        <div className="relative w-full h-full bg-black">
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
                        onClick={onRefresh}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm z-10"
                        disabled={isInitializing}
                    >
                        {isInitializing ? "Creating desktop..." : "New desktop"}
                    </Button>
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-white">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm text-white/70">
                            {isInitializing
                                ? "Initializing desktop..."
                                : "Loading stream..."}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Memoized VNC Viewer — only re-renders when streamUrl or isInitializing changes.
 * Chat message updates will NOT cause this to re-render.
 */
export const VncViewer = memo(PureVncViewer, (prev, next) => {
    return (
        prev.streamUrl === next.streamUrl &&
        prev.isInitializing === next.isInitializing &&
        prev.onRefresh === next.onRefresh
    );
});

VncViewer.displayName = "VncViewer";
