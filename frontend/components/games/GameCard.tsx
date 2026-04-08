"use client";

import Link from "next/link";
import { Game } from "@/lib/api";
import { GameStatusBadge } from "./GameStatusBadge";

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const date = game.game_date
    ? new Date(game.game_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const canAnnotate = game.status === "READY";

  return (
    <div
      className="group relative rounded-lg p-5 transition-all"
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-bright)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300 rounded-t-lg"
        style={{ background: "var(--accent)" }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3
          className="font-display font-700 text-lg uppercase tracking-wide leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {game.name}
        </h3>
        <GameStatusBadge status={game.status} className="ml-3 shrink-0" />
      </div>

      {/* Teams */}
      {(game.home_team || game.away_team) && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{ background: "rgba(249,115,22,0.15)", color: "var(--team-a)" }}
          >
            {game.home_team || "TBD"}
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>vs</span>
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{ background: "rgba(6,182,212,0.15)", color: "var(--team-b)" }}
          >
            {game.away_team || "TBD"}
          </span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 mb-4">
        {date && (
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
            {date}
          </span>
        )}
        {game.location && (
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
            {game.location}
          </span>
        )}
      </div>

      {/* Progress bar for processing */}
      {game.status === "PROCESSING" && (
        <div
          className="mb-4 h-1 rounded-full overflow-hidden"
          style={{ background: "var(--bg-overlay)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${game.progress}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href={`/games/${game.id}`}
          className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-colors"
          style={{
            color: "var(--text-secondary)",
            border: "1px solid var(--border-bright)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)")}
        >
          View
        </Link>
        {canAnnotate && (
          <Link
            href={`/games/${game.id}/annotate`}
            className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-colors"
            style={{
              background: "var(--accent-glow)",
              color: "var(--accent)",
              border: "1px solid var(--accent-dim)",
            }}
          >
            Annotate
          </Link>
        )}
      </div>
    </div>
  );
}
