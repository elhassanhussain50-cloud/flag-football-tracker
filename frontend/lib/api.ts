/**
 * Typed API client — all calls go through /api/* which Next.js proxies to the FastAPI backend.
 */

const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  login: (email: string, password: string) =>
    request<{ user_id: number; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<{ user_id: number; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<{ user_id: number; email: string }>("/auth/me"),
};

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export interface Game {
  id: number;
  user_id: number;
  name: string;
  game_date: string | null;
  location: string | null;
  home_team: string | null;
  away_team: string | null;
  video_path: string | null;
  status: "PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "ERROR";
  progress: number;
  pipeline_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameCreate {
  name: string;
  game_date?: string;
  location?: string;
  home_team?: string;
  away_team?: string;
}

export const games = {
  list: () => request<Game[]>("/games"),

  create: (data: GameCreate) =>
    request<Game>("/games", { method: "POST", body: JSON.stringify(data) }),

  get: (id: number) => request<Game>(`/games/${id}`),

  update: (id: number, data: Partial<GameCreate>) =>
    request<Game>(`/games/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<{ deleted: number }>(`/games/${id}`, { method: "DELETE" }),

  upload: async (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/games/${id}/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? "Upload failed");
    }
    return res.json() as Promise<Game>;
  },

  process: (id: number) =>
    request<{ status: string }>(`/games/${id}/process`, { method: "POST" }),

  status: (id: number) =>
    request<{ status: string; progress: number; pipeline_error: string | null }>(
      `/games/${id}/status`
    ),
};

// ---------------------------------------------------------------------------
// Annotation
// ---------------------------------------------------------------------------

export interface TrackingDot {
  tracking_id: number;
  x_pixel: number;
  y_pixel: number;
  x_yards: number;
  y_yards: number;
  jersey: string | null;
  name: string | null;
  team: string | null;
}

export interface Player {
  tracking_id: number;
  jersey: string | null;
  name: string | null;
  team: string | null;
}

export interface GameEvent {
  id: number;
  frame_no: number;
  event_type: string;
  tracking_id: number | null;
  jersey: string | null;
  play_id: string | null;
  notes: string | null;
  created_at: string;
}

export const annotation = {
  info: (gameId: number) =>
    request<{ video: string; total_frames: number }>(`/games/${gameId}/info`),

  frame: (gameId: number, frameNo: number) =>
    request<TrackingDot[]>(`/games/${gameId}/tracking/frame/${frameNo}`),

  getPlayers: (gameId: number) => request<Player[]>(`/games/${gameId}/players`),

  setPlayer: (gameId: number, data: Omit<Player, "tracking_id"> & { tracking_id: number }) =>
    request<Player>(`/games/${gameId}/players`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getEvents: (gameId: number) => request<GameEvent[]>(`/games/${gameId}/events`),

  createEvent: (
    gameId: number,
    data: {
      frame_no: number;
      event_type: string;
      tracking_id?: number;
      jersey?: string;
      play_id?: string;
      notes?: string;
    }
  ) =>
    request<GameEvent>(`/games/${gameId}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteEvent: (gameId: number, eventId: number) =>
    request<{ deleted: number }>(`/games/${gameId}/events/${eventId}`, {
      method: "DELETE",
    }),
};
