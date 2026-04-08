"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Game, games } from "@/lib/api";
import { GameStatusBadge } from "@/components/games/GameStatusBadge";

export default function GameDetailPage() {
  const params = useParams();
  const gameId = Number(params.gameId);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    games.get(gameId)
      .then(setGame)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  // Poll if processing
  useEffect(() => {
    if (game?.status !== "PROCESSING") return;
    const interval = setInterval(async () => {
      try {
        const s = await games.status(gameId);
        setGame((g) => g ? { ...g, status: s.status as Game["status"], progress: s.progress } : g);
        if (s.status !== "PROCESSING") clearInterval(interval);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [game?.status, gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center font-mono text-sm" style={{ color: "var(--status-error)" }}>
        {error || "Game not found"}
      </div>
    );
  }

  const date = game.game_date
    ? new Date(game.game_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider">
          Games
        </Link>
        <span>/</span>
        <span className="uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{game.name}</span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="font-display text-3xl font-700 uppercase tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            {game.name}
          </h1>
          {date && (
            <p className="font-mono text-xs mt-1" style={{ color: "var(--text-muted)" }}>{date}</p>
          )}
        </div>
        <GameStatusBadge status={game.status} />
      </div>

      {/* Details card */}
      <div
        className="rounded-lg p-6 mb-6 space-y-4"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        {(game.home_team || game.away_team) && (
          <div>
            <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Teams</div>
            <div className="flex items-center gap-3">
              <span className="font-display text-lg font-700" style={{ color: "var(--team-a)" }}>{game.home_team || "TBD"}</span>
              <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>vs</span>
              <span className="font-display text-lg font-700" style={{ color: "var(--team-b)" }}>{game.away_team || "TBD"}</span>
            </div>
          </div>
        )}

        {game.location && (
          <div>
            <div className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Location</div>
            <div className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>{game.location}</div>
          </div>
        )}

        {game.status === "PROCESSING" && (
          <div>
            <div className="flex justify-between font-mono text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              <span>Pipeline running…</span>
              <span>{game.progress}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${game.progress}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
        )}

        {game.pipeline_error && (
          <p className="font-mono text-xs" style={{ color: "var(--status-error)" }}>{game.pipeline_error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {game.status === "READY" && (
          <Link
            href={`/games/${game.id}/annotate`}
            className="px-6 py-2.5 rounded font-display font-700 text-sm tracking-widest uppercase glow-amber"
            style={{ background: "var(--accent)", color: "#0d0d0f" }}
          >
            Annotate
          </Link>
        )}
        {game.status === "UPLOADED" && (
          <Link
            href={`/games/new`}
            className="px-5 py-2.5 rounded font-mono text-xs uppercase tracking-wider"
            style={{ border: "1px solid var(--border-bright)", color: "var(--text-secondary)" }}
          >
            Reprocess
          </Link>
        )}
        <Link
          href="/"
          className="px-5 py-2.5 rounded font-mono text-xs uppercase tracking-wider"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          ← Back to Games
        </Link>
      </div>
    </div>
  );
}
