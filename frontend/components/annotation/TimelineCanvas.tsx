"use client";

import { useEffect, useRef } from "react";
import { GameEvent } from "@/lib/api";
import { EVENT_COLORS } from "@/lib/constants";

interface Props {
  events: GameEvent[];
  totalFrames: number;
  currentFrame: number;
  fps: number;
  onSeek: (time: number) => void;
}

export function TimelineCanvas({ events, totalFrames, currentFrame, fps, onSeek }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  function draw(frame: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Track bar
    ctx.fillStyle = "#2a2a32";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(0, 10, W, 12, 3);
    } else {
      ctx.rect(0, 10, W, 12);
    }
    ctx.fill();

    // Event pips
    events.forEach((ev) => {
      const ex = (ev.frame_no / totalFrames) * W;
      ctx.fillStyle = EVENT_COLORS[ev.event_type as keyof typeof EVENT_COLORS] ?? "#fff";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(ex - 2, 6, 4, 20, 2);
      } else {
        ctx.rect(ex - 2, 6, 4, 20);
      }
      ctx.fill();
    });

    // Playhead
    const px = ((frame || 0) / totalFrames) * W;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(px, 4);
    ctx.lineTo(px - 4, 0);
    ctx.lineTo(px + 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(px - 1, 4, 2, 28);
  }

  useEffect(() => {
    draw(currentFrame);
  }, [events, currentFrame, totalFrames]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (w > 0) {
        canvas.width = w;
        canvas.height = 32;
        draw(currentFrame);
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [currentFrame]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = e.nativeEvent.offsetX / canvas.width;
    onSeek(ratio);
  }

  return (
    <div ref={wrapRef} className="h-8 flex-shrink-0">
      <canvas
        ref={canvasRef}
        height={32}
        className="w-full block cursor-pointer"
        onClick={handleClick}
      />
    </div>
  );
}
