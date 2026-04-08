"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { annotation, GameEvent, Player, TrackingDot } from "@/lib/api";
import { HOTKEYS } from "@/lib/constants";

export type AnnotationState = "idle" | "player_sel" | "pass_open";

export interface OpenPlay {
  play_id: string;
  passer_jersey: string | null;
  frame_no: number;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dotColor(dot: TrackingDot): string {
  if (dot.team === "A") return "#f97316";
  if (dot.team === "B") return "#06b6d4";
  return "#f5a623";
}

export function useAnnotation(gameId: number) {
  const [state, setState] = useState<AnnotationState>("idle");
  const [dotCache, setDotCache] = useState<TrackingDot[]>([]);
  const [playerMap, setPlayerMap] = useState<Record<number, Player>>({});
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedDot, setSelectedDot] = useState<TrackingDot | null>(null);
  const [openPlay, setOpenPlay] = useState<OpenPlay | null>(null);
  const [jerseyTarget, setJerseyTarget] = useState<{ dot: TrackingDot; x: number; y: number } | null>(null);
  const [flash, setFlash] = useState("");
  const [totalFrames, setTotalFrames] = useState(1);
  const [fps, setFps] = useState(25);
  const lastFetchedFrame = useRef(-1);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFlash(msg: string) {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(""), 2200);
  }

  // Load initial data
  useEffect(() => {
    annotation.info(gameId).then((info) => setTotalFrames(info.total_frames || 1));
    loadPlayers();
    loadEvents();
  }, [gameId]);

  async function loadPlayers() {
    const list = await annotation.getPlayers(gameId);
    const map: Record<number, Player> = {};
    list.forEach((p) => (map[p.tracking_id] = p));
    setPlayerMap(map);
  }

  async function loadEvents() {
    const list = await annotation.getEvents(gameId);
    setEvents(list);
  }

  function mergePlayerInfo(dots: TrackingDot[]): TrackingDot[] {
    return dots.map((d) => {
      const p = playerMap[d.tracking_id];
      if (p) return { ...d, jersey: p.jersey, name: p.name, team: p.team };
      return d;
    });
  }

  async function fetchFrame(frame: number) {
    if (frame === lastFetchedFrame.current) return;
    lastFetchedFrame.current = frame;
    try {
      const dots = await annotation.frame(gameId, frame);
      setDotCache(mergePlayerInfo(dots));
    } catch {
      setDotCache([]);
    }
  }

  function handleVideoClick(
    mouseX: number,
    mouseY: number,
    videoRect: { x: number; y: number; w: number; h: number },
    videoWidth: number,
    videoHeight: number
  ) {
    if (jerseyTarget) return;
    if (!videoWidth || !videoHeight) return;

    const sx = videoRect.w / videoWidth;
    const sy = videoRect.h / videoHeight;

    let closest: TrackingDot | null = null;
    let minDist = 25;
    dotCache.forEach((dot) => {
      const cx = videoRect.x + dot.x_pixel * sx;
      const cy = videoRect.y + dot.y_pixel * sy;
      const d = Math.hypot(mouseX - cx, mouseY - cy);
      if (d < minDist) {
        minDist = d;
        closest = dot;
      }
    });

    if (!closest) {
      if (state !== "pass_open") {
        setSelectedDot(null);
        setState("idle");
      }
      return;
    }

    const dot = closest as TrackingDot;
    setSelectedDot(dot);
    setState("player_sel");

    if (!dot.jersey) {
      const cx = videoRect.x + dot.x_pixel * sx;
      const cy = videoRect.y + dot.y_pixel * sy;
      setJerseyTarget({ dot, x: cx, y: cy });
    } else {
      showFlash(`Selected #${dot.jersey}`);
    }
  }

  async function tagEvent(type: string, currentFrame: number) {
    if ((type === "CATCH" || type === "INCOMPLETE") && state === "pass_open") {
      await annotation.createEvent(gameId, {
        frame_no: currentFrame,
        event_type: type,
        tracking_id: selectedDot?.tracking_id ?? undefined,
        jersey: selectedDot?.jersey ?? undefined,
        play_id: openPlay!.play_id,
      });
      setOpenPlay(null);
      setSelectedDot(null);
      setState("idle");
      await loadEvents();
      showFlash(`${type} — play closed`);
      return;
    }

    if (!selectedDot) {
      showFlash("Click a player dot first");
      return;
    }

    const { tracking_id: tid, jersey } = selectedDot;

    if (type === "PASS") {
      const play_id = uuid();
      await annotation.createEvent(gameId, {
        frame_no: currentFrame,
        event_type: "PASS",
        tracking_id: tid,
        jersey: jersey ?? undefined,
        play_id,
      });
      setOpenPlay({ play_id, passer_jersey: jersey, frame_no: currentFrame });
      setSelectedDot(null);
      setState("pass_open");
      await loadEvents();
      showFlash(`PASS by #${jersey ?? tid} — select receiver`);
      return;
    }

    await annotation.createEvent(gameId, {
      frame_no: currentFrame,
      event_type: type,
      tracking_id: tid,
      jersey: jersey ?? undefined,
    });
    setSelectedDot(null);
    setState("idle");
    await loadEvents();
    showFlash(`${type} — #${jersey ?? tid} @ f.${currentFrame}`);
  }

  function cancelOpenPlay() {
    if (state === "pass_open") {
      setOpenPlay(null);
      setSelectedDot(null);
      setState("idle");
      showFlash("Play cancelled");
    } else {
      setSelectedDot(null);
      setState("idle");
    }
  }

  async function assignJersey(dot: TrackingDot, jersey: string) {
    setJerseyTarget(null);
    if (!jersey.trim()) return;
    await annotation.setPlayer(gameId, { tracking_id: dot.tracking_id, jersey: jersey.trim(), name: dot.name, team: dot.team });
    await loadPlayers();
    setSelectedDot((prev) => (prev?.tracking_id === dot.tracking_id ? { ...prev, jersey } : prev));
    showFlash(`#${jersey} assigned`);
  }

  async function deleteEvent(eventId: number) {
    await annotation.deleteEvent(gameId, eventId);
    await loadEvents();
  }

  async function deletePlay(eventIds: number[]) {
    await Promise.all(eventIds.map((id) => annotation.deleteEvent(gameId, id)));
    await loadEvents();
  }

  return {
    state,
    dotCache,
    playerMap,
    events,
    selectedDot,
    openPlay,
    jerseyTarget,
    flash,
    totalFrames,
    fps,
    setFps,
    fetchFrame,
    handleVideoClick,
    tagEvent,
    cancelOpenPlay,
    assignJersey,
    deleteEvent,
    deletePlay,
    dotColor,
    loadPlayers,
    setSelectedDot,
    setState,
    setJerseyTarget,
  };
}
