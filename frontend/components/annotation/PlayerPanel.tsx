"use client";

import { Player, TrackingDot } from "@/lib/api";

interface Props {
  players: Player[];
  selectedId: number | null;
  dotCache: TrackingDot[];
  onSelect: (dot: TrackingDot & { jersey?: string | null; name?: string | null }) => void;
}

function teamColor(team: string | null): string {
  if (team === "A") return "#f97316";
  if (team === "B") return "#06b6d4";
  return "#f5a623";
}

export function PlayerPanel({ players, selectedId, dotCache, onSelect }: Props) {
  if (!players.length) {
    return (
      <div className="px-3 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        Click a dot to assign a jersey.
      </div>
    );
  }

  return (
    <div>
      {players.map((p) => {
        const isSel = selectedId === p.tracking_id;
        const col = teamColor(p.team);

        return (
          <div
            key={p.tracking_id}
            onClick={() => {
              const dot = dotCache.find((d) => d.tracking_id === p.tracking_id);
              if (dot) onSelect({ ...dot, jersey: p.jersey, name: p.name, team: p.team });
            }}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors"
            style={{
              background: isSel ? "rgba(245,166,35,0.08)" : "transparent",
              borderLeft: isSel ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: col }}
            />
            <span
              className="font-display font-700 min-w-[24px]"
              style={{ color: p.jersey ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {p.jersey ? `#${p.jersey}` : "—"}
            </span>
            <span
              className="font-mono flex-1 truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {p.name || `dot ${p.tracking_id}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
