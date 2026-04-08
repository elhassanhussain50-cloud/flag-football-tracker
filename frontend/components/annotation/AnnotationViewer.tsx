"use client";

import { useEffect, useRef, useState } from "react";
import { HOTKEYS } from "@/lib/constants";
import { useAnnotation } from "./useAnnotation";
import { VideoCanvas, getVideoRect } from "./VideoCanvas";
import { TimelineCanvas } from "./TimelineCanvas";
import { PlayerPanel } from "./PlayerPanel";
import { EventPanel } from "./EventPanel";
import { JerseyPopup } from "./JerseyPopup";

const EVENT_TYPES = [
  { key: "P", type: "PASS", color: "#3b82f6" },
  { key: "C", type: "CATCH", color: "#22c55e" },
  { key: "F", type: "FLAG_PULL", color: "#ef4444" },
  { key: "T", type: "TOUCHDOWN", color: "#a855f7" },
  { key: "I", type: "INCOMPLETE", color: "#6b7280" },
  { key: "R", type: "ROUTE", color: "#f97316" },
];

interface Props {
  gameId: number;
}

export function AnnotationViewer({ gameId }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoWrapRef = useRef<HTMLDivElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const ann = useAnnotation(gameId);
  const players = Object.values(ann.playerMap);

  // Keydown handler
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (ann.jerseyTarget) return;
      if (e.key === "Escape") { ann.cancelOpenPlay(); return; }
      const type = HOTKEYS[e.key.toLowerCase()];
      if (type) ann.tagEvent(type, currentFrame);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [currentFrame, ann]);

  function handleSeek(ratio: number) {
    const vid = document.querySelector<HTMLVideoElement>(`video[src*="${gameId}/video"]`);
    if (vid) vid.currentTime = ratio * vid.duration;
  }

  function seekToFrame(frame: number) {
    const vid = document.querySelector<HTMLVideoElement>(`video[src*="${gameId}/video"]`);
    if (vid && ann.fps) vid.currentTime = frame / ann.fps;
  }

  // Hotkey dim logic
  function isHotkeyDim(type: string): boolean {
    if (ann.state === "idle") return type === "CATCH";
    if (ann.state === "pass_open") return !["CATCH", "INCOMPLETE"].includes(type);
    return false;
  }

  // State banner
  function stateBannerText(): string | null {
    if (ann.state === "player_sel" && ann.selectedDot) {
      const lbl = ann.selectedDot.jersey ? `#${ann.selectedDot.jersey}` : `dot ${ann.selectedDot.tracking_id}`;
      return `${lbl} selected — press hotkey`;
    }
    if (ann.state === "pass_open" && ann.openPlay) {
      return `PASS open — #${ann.openPlay.passer_jersey ?? "?"} throwing · select receiver → C or I`;
    }
    return null;
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-56px)]"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-2 flex-shrink-0"
        style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          Frame <span style={{ color: "var(--text-secondary)" }}>{currentFrame}</span>
        </span>
        {stateBannerText() && (
          <span
            className="font-mono text-xs px-3 py-1 rounded ml-auto"
            style={{
              background: ann.state === "pass_open" ? "rgba(59,130,246,0.15)" : "rgba(245,166,35,0.15)",
              color: ann.state === "pass_open" ? "#60a5fa" : "var(--accent)",
              border: `1px solid ${ann.state === "pass_open" ? "rgba(59,130,246,0.3)" : "var(--accent-dim)"}`,
            }}
          >
            {stateBannerText()}
          </span>
        )}
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Centre: video + timeline + hotkeys */}
        <div className="flex-1 flex flex-col p-2 gap-2 min-w-0 min-h-0">
          {/* Video with canvas overlay */}
          <div ref={videoWrapRef} className="relative flex-1 min-h-0">
            <VideoCanvas
              gameId={gameId}
              onFrameChange={(f) => {
                setCurrentFrame(f);
                ann.fetchFrame(f);
              }}
              onVideoInit={ann.setFps}
              onVideoClick={(mx, my, vr, vw, vh) =>
                ann.handleVideoClick(mx, my, vr, vw, vh)
              }
              dotCache={ann.dotCache}
              selectedDotId={ann.selectedDot?.tracking_id ?? null}
              fps={ann.fps}
            />

            {/* Jersey popup */}
            {ann.jerseyTarget && videoWrapRef.current && (
              <JerseyPopup
                dot={ann.jerseyTarget.dot}
                x={ann.jerseyTarget.x}
                y={ann.jerseyTarget.y}
                containerWidth={videoWrapRef.current.clientWidth}
                containerHeight={videoWrapRef.current.clientHeight}
                onAssign={ann.assignJersey}
                onSkip={() => ann.setJerseyTarget(null)}
              />
            )}
          </div>

          {/* Timeline */}
          <TimelineCanvas
            events={ann.events}
            totalFrames={ann.totalFrames}
            currentFrame={currentFrame}
            fps={ann.fps}
            onSeek={handleSeek}
          />

          {/* Hotkeys */}
          <div className="flex gap-2 flex-wrap flex-shrink-0">
            {EVENT_TYPES.map(({ key, type, color }) => (
              <button
                key={type}
                onClick={() => ann.tagEvent(type, currentFrame)}
                className="px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-all"
                style={{
                  border: `1.5px solid ${color}`,
                  color,
                  background: "transparent",
                  opacity: isHotkeyDim(type) ? 0.25 : 1,
                  pointerEvents: isHotkeyDim(type) ? "none" : "auto",
                }}
              >
                {key} — {type.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div
          className="w-60 flex flex-col overflow-hidden flex-shrink-0"
          style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-raised)" }}
        >
          {/* Players */}
          <div
            className="font-mono text-xs uppercase tracking-widest px-3 py-2 flex-shrink-0"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
          >
            Players
          </div>
          <div
            className="overflow-y-auto flex-shrink-0"
            style={{ maxHeight: 180, borderBottom: "1px solid var(--border)" }}
          >
            <PlayerPanel
              players={players}
              selectedId={ann.selectedDot?.tracking_id ?? null}
              dotCache={ann.dotCache}
              onSelect={(dot) => {
                ann.setSelectedDot(dot as any);
                ann.setState("player_sel");
              }}
            />
          </div>

          {/* Events */}
          <div
            className="font-mono text-xs uppercase tracking-widest px-3 py-2 flex-shrink-0"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
          >
            Events ({ann.events.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            <EventPanel
              events={ann.events}
              fps={ann.fps}
              onSeekToFrame={seekToFrame}
              onDeletePlay={ann.deletePlay}
              onDeleteEvent={ann.deleteEvent}
            />
          </div>
        </div>
      </div>

      {/* Flash notification */}
      {ann.flash && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-mono text-xs pointer-events-none z-50 transition-all"
          style={{
            background: "var(--bg-overlay)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-bright)",
          }}
        >
          {ann.flash}
        </div>
      )}
    </div>
  );
}
