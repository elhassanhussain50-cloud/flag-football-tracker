"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await auth.login(email, password);
      } else {
        await auth.register(email, password);
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mode tabs */}
      <div className="flex mb-8 border-b" style={{ borderColor: "var(--border)" }}>
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className="font-display text-sm font-700 tracking-widest uppercase px-4 pb-3 transition-colors"
            style={{
              color: mode === m ? "var(--accent)" : "var(--text-muted)",
              borderBottom: mode === m ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {m === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block font-mono text-xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded text-sm transition-all outline-none"
            style={{
              background: "var(--bg-overlay)",
              border: "1px solid var(--border-bright)",
              color: "var(--text-primary)",
              fontFamily: "'DM Mono', monospace",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
            placeholder="coach@team.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block font-mono text-xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded text-sm transition-all outline-none"
            style={{
              background: "var(--bg-overlay)",
              border: "1px solid var(--border-bright)",
              color: "var(--text-primary)",
              fontFamily: "'DM Mono', monospace",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-bright)")}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p
            className="text-xs font-mono py-2 px-3 rounded"
            style={{
              color: "var(--status-error)",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded font-display font-700 text-sm tracking-widest uppercase transition-all relative overflow-hidden"
          style={{
            background: loading ? "var(--accent-dim)" : "var(--accent)",
            color: "#0d0d0f",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-[#0d0d0f]/40 border-t-[#0d0d0f] rounded-full animate-spin" />
              {mode === "login" ? "Signing in…" : "Creating account…"}
            </span>
          ) : (
            mode === "login" ? "Sign In" : "Create Account"
          )}
        </button>
      </form>
    </div>
  );
}
