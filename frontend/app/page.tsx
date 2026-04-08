"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Game, games } from "@/lib/api";
import { GameCard } from "@/components/games/GameCard";

export default function DashboardPage() {
  const [gameList, setGameList] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    games.list()
      .then(setGameList)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1
            className="font-display text-4xl font-700 uppercase tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            Games
          </h1>
          <p className="font-mono text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {gameList.length} {gameList.length === 1 ? "session" : "sessions"} collected
          </p>
        </div>
        <Link
          href="/games/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded font-display font-700 text-sm tracking-widest uppercase"
          style={{ background: "var(--accent)", color: "#0d0d0f" }}
        >
          <span className="text-lg leading-none">+</span>
          Create a game
        </Link>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px" style={{ background: "var(--border)" }} />

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="text-center py-20 font-mono text-sm"
          style={{ color: "var(--status-error)" }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && gameList.length === 0 && (
        <div className="text-center py-24">
          <div
            className="font-display text-6xl font-800 uppercase tracking-widest mb-4"
            style={{ color: "var(--border-bright)" }}
          >
            No Games Yet
          </div>
          <p className="font-mono text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            Upload your first game film and start tagging plays.
          </p>
          <Link
            href="/games/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded font-display font-700 text-sm tracking-widest uppercase glow-amber"
            style={{ background: "var(--accent)", color: "#0d0d0f" }}
          >
            Create First Game
          </Link>
        </div>
      )}

      {/* Game grid */}
      {!loading && !error && gameList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameList.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
