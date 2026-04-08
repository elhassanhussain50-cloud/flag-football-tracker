"use client";

import { useState } from "react";
import { games, GameCreate } from "@/lib/api";

interface Props {
  onNext: (gameId: number) => void;
}

export function Step1Metadata({ onNext }: Props) {
  const [form, setForm] = useState<GameCreate>({
    name: "",
    game_date: "",
    location: "",
    home_team: "",
    away_team: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof GameCreate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const game = await games.create({
        ...form,
        game_date: form.game_date || undefined,
        location: form.location || undefined,
        home_team: form.home_team || undefined,
        away_team: form.away_team || undefined,
      });
      onNext(game.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-bright)",
    color: "var(--text-primary)",
    fontFamily: "'DM Mono', monospace",
  };

  const labelStyle = {
    color: "var(--text-secondary)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={labelStyle}>
          Game Name <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          required
          value={form.name}
          onChange={set("name")}
          placeholder="Week 4 — Championship Qualifier"
          className="w-full px-4 py-3 rounded text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={labelStyle}>
            Home Team
          </label>
          <input
            value={form.home_team}
            onChange={set("home_team")}
            placeholder="Team A"
            className="w-full px-4 py-3 rounded text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--team-a)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
          />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={labelStyle}>
            Away Team
          </label>
          <input
            value={form.away_team}
            onChange={set("away_team")}
            placeholder="Team B"
            className="w-full px-4 py-3 rounded text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--team-b)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={labelStyle}>
            Date
          </label>
          <input
            type="date"
            value={form.game_date}
            onChange={set("game_date")}
            className="w-full px-4 py-3 rounded text-sm outline-none transition-all"
            style={{ ...inputStyle, colorScheme: "dark" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
          />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={labelStyle}>
            Location
          </label>
          <input
            value={form.location}
            onChange={set("location")}
            placeholder="Riverside Field 2"
            className="w-full px-4 py-3 rounded text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
          />
        </div>
      </div>

      {error && (
        <p
          className="text-xs font-mono py-2 px-3 rounded"
          style={{ color: "var(--status-error)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded font-display font-700 text-sm tracking-widest uppercase mt-2 transition-all"
        style={{ background: "var(--accent)", color: "#0d0d0f", opacity: loading ? 0.7 : 1 }}
      >
        {loading ? "Creating…" : "Continue to Upload →"}
      </button>
    </form>
  );
}
