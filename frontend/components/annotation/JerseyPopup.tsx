"use client";

import { useEffect, useRef, useState } from "react";
import { TrackingDot } from "@/lib/api";

interface Props {
  dot: TrackingDot;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  onAssign: (dot: TrackingDot, jersey: string) => void;
  onSkip: () => void;
}

export function JerseyPopup({ dot, x, y, containerWidth, containerHeight, onAssign, onSkip }: Props) {
  const [jersey, setJersey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const left = Math.min(x, containerWidth - 180);
  const top = Math.min(y + 14, containerHeight - 90);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.stopPropagation(); onAssign(dot, jersey); }
    if (e.key === "Escape") { e.stopPropagation(); onSkip(); }
    e.stopPropagation();
  }

  return (
    <div
      className="absolute rounded-lg p-3 z-10"
      style={{
        left,
        top,
        minWidth: 160,
        background: "var(--bg-overlay)",
        border: "1px solid var(--border-bright)",
      }}
    >
      <label className="block font-mono text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
        Jersey for dot {dot.tracking_id}
      </label>
      <input
        ref={inputRef}
        type="text"
        maxLength={3}
        placeholder="e.g. 8"
        value={jersey}
        onChange={(e) => setJersey(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1.5 rounded text-sm outline-none font-mono"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border-bright)",
          color: "var(--text-primary)",
        }}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onAssign(dot, jersey)}
          className="flex-1 py-1 rounded font-mono text-xs"
          style={{ background: "var(--accent)", color: "#0d0d0f" }}
        >
          Assign
        </button>
        <button
          onClick={onSkip}
          className="flex-1 py-1 rounded font-mono text-xs"
          style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
