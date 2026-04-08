"use client";

import { useRef, useState } from "react";
import { games } from "@/lib/api";

interface Props {
  gameId: number;
  onNext: () => void;
}

export function Step2Upload({ gameId, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File) {
    if (!f.type.startsWith("video/")) {
      setError("Please upload a video file (.mp4, .mov)");
      return;
    }
    setFile(f);
    setError("");
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    // Use XMLHttpRequest for upload progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const body = JSON.parse(xhr.responseText);
            reject(new Error(body.detail ?? "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));

      xhr.open("POST", `/api/games/${gameId}/upload`);
      xhr.withCredentials = true;
      xhr.send(form);
    }).catch((err: Error) => {
      setError(err.message);
      setUploading(false);
      return;
    });

    setUploading(false);
    if (!error) onNext();
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className="cursor-pointer rounded-lg p-10 text-center transition-all"
        style={{
          border: `2px dashed ${dragOver ? "var(--accent)" : file ? "var(--status-ready)" : "var(--border-bright)"}`,
          background: dragOver ? "var(--accent-glow)" : "var(--bg-overlay)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {file ? (
          <div>
            <div className="font-mono text-sm mb-1" style={{ color: "var(--status-ready)" }}>
              ✓ {file.name}
            </div>
            <div className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB — click to change
            </div>
          </div>
        ) : (
          <div>
            <div
              className="font-display text-4xl font-800 mb-3"
              style={{ color: "var(--border-bright)" }}
            >
              DROP VIDEO
            </div>
            <div className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              or click to browse — .mp4, .mov
            </div>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div>
          <div className="flex justify-between font-mono text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      )}

      {error && (
        <p
          className="text-xs font-mono py-2 px-3 rounded"
          style={{ color: "var(--status-error)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </p>
      )}

      <button
        disabled={!file || uploading}
        onClick={handleUpload}
        className="w-full py-3 rounded font-display font-700 text-sm tracking-widest uppercase transition-all"
        style={{
          background: file && !uploading ? "var(--accent)" : "var(--bg-overlay)",
          color: file && !uploading ? "#0d0d0f" : "var(--text-muted)",
          cursor: file && !uploading ? "pointer" : "not-allowed",
          border: "1px solid var(--border-bright)",
        }}
      >
        {uploading ? `Uploading ${progress}%…` : "Upload & Continue →"}
      </button>
    </div>
  );
}
