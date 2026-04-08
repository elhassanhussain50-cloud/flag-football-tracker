"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { games } from "@/lib/api";

interface Props {
  gameId: number;
}

export function Step3Processing({ gameId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState("PROCESSING");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function start() {
      // Check current status first — if already running or done, just poll
      const current = await games.status(gameId).catch(() => null);

      if (current?.status === "READY") {
        setStatus("READY");
        setProgress(100);
        return;
      }

      if (current?.status !== "PROCESSING") {
        // Only trigger if not already running
        await games.process(gameId).catch((e: Error) => {
          setError(e.message);
          setStatus("ERROR");
        });
      }

      // Start polling
      intervalRef.current = setInterval(async () => {
        try {
          const s = await games.status(gameId);
          setStatus(s.status);
          setProgress(s.progress);

          if (s.status === "READY" || s.status === "ERROR") {
            clearInterval(intervalRef.current!);
            if (s.status === "ERROR") {
              setError(s.pipeline_error ?? "Pipeline failed");
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 3000);
    }

    start();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameId]);

  function handleRetry() {
    startedRef.current = false;
    setError("");
    setStatus("PROCESSING");
    setProgress(0);
    // Re-trigger by flipping the ref
    startedRef.current = false;
    setTimeout(() => {
      startedRef.current = false;
    }, 0);
  }

  return (
    <div className="text-center py-4 space-y-6">
      {status === "PROCESSING" && (
        <>
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div
                className="absolute inset-0 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              />
              <div
                className="absolute inset-3 rounded-full animate-pulse"
                style={{ background: "var(--accent-glow)" }}
              />
            </div>
          </div>

          <div>
            <div
              className="font-display text-xl font-700 uppercase tracking-widest mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Running Pipeline
            </div>
            <div className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              Detecting players · Tracking movement · Mapping to field
            </div>
          </div>

          <div>
            <div className="flex justify-between font-mono text-xs mb-2 px-2" style={{ color: "var(--text-muted)" }}>
              <span>YOLOv8m + BoT-SORT</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progress, 4)}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
        </>
      )}

      {status === "READY" && (
        <>
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid var(--status-ready)" }}
          >
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <div
              className="font-display text-xl font-700 uppercase tracking-widest mb-1"
              style={{ color: "var(--status-ready)" }}
            >
              Pipeline Complete
            </div>
            <div className="font-mono text-xs mb-6" style={{ color: "var(--text-muted)" }}>
              All players tracked and mapped to field coordinates.
            </div>
            <button
              onClick={() => router.push(`/games/${gameId}/annotate`)}
              className="px-8 py-3 rounded font-display font-700 text-sm tracking-widest uppercase glow-amber"
              style={{ background: "var(--accent)", color: "#0d0d0f" }}
            >
              Start Annotating →
            </button>
          </div>
        </>
      )}

      {status === "ERROR" && (
        <>
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full"
            style={{ background: "rgba(239,68,68,0.15)", border: "2px solid var(--status-error)" }}
          >
            <span className="text-2xl">✕</span>
          </div>
          <div>
            <div
              className="font-display text-xl font-700 uppercase tracking-widest mb-2"
              style={{ color: "var(--status-error)" }}
            >
              Pipeline Failed
            </div>
            {error && (
              <p
                className="font-mono text-xs mb-4 px-4 py-2 rounded mx-auto max-w-xs"
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
              onClick={handleRetry}
              className="px-6 py-2.5 rounded font-mono text-xs uppercase tracking-wider"
              style={{ border: "1px solid var(--status-error)", color: "var(--status-error)" }}
            >
              Retry
            </button>
          </div>
        </>
      )}
    </div>
  );
}
