"use client";

import { memo } from "react";
import type { AgentEvent, ToolActivity } from "@/types/agent-events";
import { MonitorSmartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolDetailsPanel } from "@/components/dashboard/tool-details-panel";

type VncPanelProps = {
  isInitializing: boolean;
  streamUrl: string | null;
  onRefresh: () => void;
  selectedEvent: AgentEvent | null;
  selectedToolActivity: ToolActivity | null;
  runtimeError: string | null;
};

type VncViewerProps = {
  isInitializing: boolean;
  streamUrl: string | null;
};

const VncViewer = memo(function VncViewer({
  isInitializing,
  streamUrl,
}: VncViewerProps) {
  return (
    <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-black">
      {streamUrl ? (
        // The viewer stays in its own memoized boundary so event/debug state
        // can evolve without remounting the live noVNC iframe.
        <iframe
          src={streamUrl}
          className="h-full w-full"
          style={{
            transformOrigin: "center",
            width: "100%",
            height: "100%",
          }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <p className="text-lg font-medium">
              {isInitializing ? "Initializing desktop..." : "Loading stream..."}
            </p>
            <p className="mt-2 text-sm text-white/60">
              The live sandbox desktop will appear here once the VNC stream is
              ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export function VncPanel({
  isInitializing,
  streamUrl,
  onRefresh,
  selectedEvent,
  selectedToolActivity,
  runtimeError,
}: VncPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),_transparent_50%),linear-gradient(180deg,#141414_0%,#0a0a0a_100%)] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10">
            <MonitorSmartphone className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-[0.16em] text-white/90 uppercase">
              Live Workspace
            </h2>
            <p className="text-sm text-white/60">
              VNC stream stays mounted on the right for live agent control.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={onRefresh}
          disabled={isInitializing}
          variant="secondary"
          className="rounded-xl border border-white/10 bg-white/10 text-white shadow-none hover:bg-white/15"
        >
          <RefreshCw className="size-4" />
          {isInitializing ? "Creating desktop..." : "New desktop"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <VncViewer isInitializing={isInitializing} streamUrl={streamUrl} />
        <ToolDetailsPanel
          selectedEvent={selectedEvent}
          selectedToolActivity={selectedToolActivity}
          runtimeError={runtimeError}
        />
      </div>
    </section>
  );
}
