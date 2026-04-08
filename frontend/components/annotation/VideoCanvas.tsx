"use client";

import { useCallback, useEffect, useRef } from "react";
import { TrackingDot } from "@/lib/api";

interface VideoRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  gameId: number;
  onFrameChange: (frame: number) => void;
  onVideoInit: (fps: number) => void;
  onVideoClick: (mx: number, my: number, vr: VideoRect, vw: number, vh: number) => void;
  dotCache: TrackingDot[];
  selectedDotId: number | null;
  fps: number;
  onRectChange?: (rect: VideoRect) => void;
}

function dotColor(dot: TrackingDot): string {
  if (dot.team === "A") return "#f97316";
  if (dot.team === "B") return "#06b6d4";
  return "#f5a623";
}

export function getVideoRect(
  elementW: number,
  elementH: number,
  videoW: number,
  videoH: number
): VideoRect {
  if (!videoW || !videoH) return { x: 0, y: 0, w: elementW, h: elementH };
  const eA = elementW / elementH;
  const vA = videoW / videoH;
  let rW, rH, rX, rY;
  if (vA > eA) {
    rW = elementW;
    rH = elementW / vA;
    rX = 0;
    rY = (elementH - rH) / 2;
  } else {
    rH = elementH;
    rW = elementH * vA;
    rY = 0;
    rX = (elementW - rW) / 2;
  }
  return { x: rX, y: rY, w: rW, h: rH };
}

export function VideoCanvas({
  gameId,
  onFrameChange,
  onVideoInit,
  onVideoClick,
  dotCache,
  selectedDotId,
  fps,
  onRectChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  function syncCanvas() {
    const vid = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas) return;
    const w = vid.offsetWidth;
    const h = vid.offsetHeight;
    if (w > 0 && h > 0) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }
  }

  const draw = useCallback(() => {
    const vid = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!vid.videoWidth || !vid.videoHeight) return;

    const vr = getVideoRect(W, H, vid.videoWidth, vid.videoHeight);
    const sx = vr.w / vid.videoWidth;
    const sy = vr.h / vid.videoHeight;

    dotCache.forEach((dot) => {
      const cx = vr.x + dot.x_pixel * sx;
      const cy = vr.y + dot.y_pixel * sy;
      const col = dotColor(dot);
      const isSel = selectedDotId === dot.tracking_id;
      const r = isSel ? 12 : 9;

      if (isSel) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.88;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (isSel) {
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const label = dot.jersey ? `#${dot.jersey}` : `${dot.tracking_id}`;
      ctx.font = `bold ${isSel ? 11 : 10}px 'DM Mono', monospace`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy);
    });
  }, [dotCache, selectedDotId]);

  // Render loop
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    let lastFrame = -1;

    function loop() {
      syncCanvas();
      const frame = Math.round((vid!.currentTime || 0) * fps);
      if (frame !== lastFrame) {
        lastFrame = frame;
        onFrameChange(frame);
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [fps, onFrameChange, draw]);

  // Resize observer
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const ro = new ResizeObserver(syncCanvas);
    ro.observe(vid);
    return () => ro.disconnect();
  }, []);

  function handleVideoMeta() {
    const vid = videoRef.current;
    if (!vid) return;
    syncCanvas();
    if (vid.duration && fps) {
      // fps already set from info endpoint
    }
    onVideoInit(fps);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    const vid = videoRef.current;
    if (!canvas || !vid) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const vr = getVideoRect(canvas.width, canvas.height, vid.videoWidth, vid.videoHeight);
    onVideoClick(mx, my, vr, vid.videoWidth, vid.videoHeight);
  }

  return (
    <div
      className="absolute inset-0 rounded-lg overflow-hidden cursor-crosshair"
      style={{ background: "#000" }}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={`/api/games/${gameId}/video`}
        controls
        preload="metadata"
        className="w-full h-full object-contain block"
        onLoadedMetadata={handleVideoMeta}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 2 }}
      />
    </div>
  );
}
