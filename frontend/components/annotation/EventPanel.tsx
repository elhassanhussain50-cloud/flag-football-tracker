"use client";

import { GameEvent } from "@/lib/api";
import { EVENT_COLORS } from "@/lib/constants";

interface Props {
  events: GameEvent[];
  fps: number;
  onSeekToFrame: (frame: number) => void;
  onDeletePlay: (ids: number[]) => void;
  onDeleteEvent: (id: number) => void;
}

interface PlayGroup {
  play_id: string;
  events: GameEvent[];
}

function groupEvents(events: GameEvent[]): { plays: PlayGroup[]; singles: GameEvent[] } {
  const playMap: Record<string, GameEvent[]> = {};
  const singles: GameEvent[] = [];

  events.forEach((ev) => {
    if (ev.play_id) {
      (playMap[ev.play_id] = playMap[ev.play_id] ?? []).push(ev);
    } else {
      singles.push(ev);
    }
  });

  return {
    plays: Object.entries(playMap).map(([play_id, evs]) => ({ play_id, events: evs })),
    singles,
  };
}

function EventBadge({ type }: { type: string }) {
  const color = EVENT_COLORS[type as keyof typeof EVENT_COLORS] ?? "#888";
  return (
    <span
      className="px-1.5 py-0.5 rounded font-mono text-xs font-700 whitespace-nowrap flex-shrink-0"
      style={{ background: `${color}22`, color }}
    >
      {type.replace("_", " ")}
    </span>
  );
}

export function EventPanel({ events, fps, onSeekToFrame, onDeletePlay, onDeleteEvent }: Props) {
  if (!events.length) {
    return (
      <div className="px-3 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        No events yet.
      </div>
    );
  }

  const { plays, singles } = groupEvents(events);

  // Merge plays + singles and sort by frame
  const rows: React.ReactNode[] = [];

  plays.forEach((group) => {
    const pass = group.events.find((e) => e.event_type === "PASS");
    const close = group.events.find((e) => ["CATCH", "INCOMPLETE"].includes(e.event_type));
    const pLbl = pass ? (pass.jersey ? `#${pass.jersey}` : `d${pass.tracking_id}`) : "?";
    const cLbl = close ? (close.jersey ? `#${close.jersey}` : `d${close.tracking_id}`) : "…";
    const closeColor =
      close?.event_type === "CATCH" ? "#22c55e" : close ? "#6b7280" : "#f5a623";
    const frameNo = pass?.frame_no ?? group.events[0].frame_no;

    rows.push(
      <div
        key={group.play_id}
        className="flex items-center gap-1.5 px-3 py-2 cursor-pointer text-xs transition-colors group"
        style={{ borderBottom: "1px solid var(--bg-overlay)" }}
        onClick={() => onSeekToFrame(frameNo)}
      >
        <span className="font-mono flex-shrink-0" style={{ color: "var(--text-muted)", minWidth: 36 }}>
          f.{frameNo}
        </span>
        <EventBadge type="PASS" />
        <span className="font-mono flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
          {pLbl} →{" "}
          <span style={{ color: closeColor }}>{cLbl}</span>
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            onDeletePlay(group.events.map((ev) => ev.id));
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--status-error)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          ×
        </button>
      </div>
    );
  });

  singles.forEach((ev) => {
    const pl = ev.jersey ? `#${ev.jersey}` : ev.tracking_id ? `d${ev.tracking_id}` : "";
    rows.push(
      <div
        key={ev.id}
        className="flex items-center gap-1.5 px-3 py-2 cursor-pointer text-xs transition-colors group"
        style={{ borderBottom: "1px solid var(--bg-overlay)" }}
        onClick={() => onSeekToFrame(ev.frame_no)}
      >
        <span className="font-mono flex-shrink-0" style={{ color: "var(--text-muted)", minWidth: 36 }}>
          f.{ev.frame_no}
        </span>
        <EventBadge type={ev.event_type} />
        <span className="font-mono flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
          {pl}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteEvent(ev.id);
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--status-error)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          ×
        </button>
      </div>
    );
  });

  return <div>{rows}</div>;
}
