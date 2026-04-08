export const EVENT_TYPES = [
  "PASS",
  "CATCH",
  "FLAG_PULL",
  "TOUCHDOWN",
  "INCOMPLETE",
  "ROUTE",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const HOTKEYS: Record<string, EventType> = {
  p: "PASS",
  c: "CATCH",
  f: "FLAG_PULL",
  t: "TOUCHDOWN",
  i: "INCOMPLETE",
  r: "ROUTE",
};

export const EVENT_COLORS: Record<EventType, string> = {
  PASS: "#f59e0b",
  CATCH: "#22c55e",
  FLAG_PULL: "#ef4444",
  TOUCHDOWN: "#a855f7",
  INCOMPLETE: "#6b7280",
  ROUTE: "#3b82f6",
};

export const TEAM_COLORS = {
  A: "#f97316",
  B: "#06b6d4",
  unknown: "#9ca3af",
};

export const GAME_STATUSES = {
  PENDING: { label: "Pending", color: "text-zinc-400", bg: "bg-zinc-800" },
  UPLOADED: { label: "Uploaded", color: "text-blue-400", bg: "bg-blue-900/40" },
  PROCESSING: { label: "Processing", color: "text-amber-400", bg: "bg-amber-900/40" },
  READY: { label: "Ready", color: "text-emerald-400", bg: "bg-emerald-900/40" },
  ERROR: { label: "Error", color: "text-red-400", bg: "bg-red-900/40" },
} as const;
