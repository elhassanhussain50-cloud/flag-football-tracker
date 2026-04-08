"""
FastAPI annotation backend.

Run:
    python annotation/api.py --video "data/videos/game_web.mp4" --db data/outputs/tracking.db
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent))

from annotation.db import (
    delete_event,
    get_player,
    init_db,
    insert_event,
    list_events,
    list_players,
    upsert_player,
)

app = FastAPI(title="Flag Football Annotator")

_VIDEO_PATH: Path = Path()
_DB_PATH: Path    = Path()

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


# ---------------------------------------------------------------------------
# Pages & video
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/video")
async def video():
    if not _VIDEO_PATH.exists():
        raise HTTPException(404, "Video not found")
    return FileResponse(_VIDEO_PATH, media_type="video/mp4")


# ---------------------------------------------------------------------------
# Info
# ---------------------------------------------------------------------------

@app.get("/info")
def info():
    conn = get_conn()
    try:
        total_frames = conn.execute(
            "SELECT MAX(frame_no) FROM tracking"
        ).fetchone()[0] or 0
        fps_row = conn.execute(
            "SELECT MAX(frame_no) FROM tracking"
        ).fetchone()
        return {"video": _VIDEO_PATH.name, "total_frames": total_frames}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

class PlayerIn(BaseModel):
    tracking_id: int
    jersey:      Optional[str] = None
    name:        Optional[str] = None
    team:        Optional[str] = None


@app.get("/players")
def get_players():
    conn = get_conn()
    try:
        return list_players(conn)
    finally:
        conn.close()


@app.post("/players", status_code=201)
def set_player(p: PlayerIn):
    conn = get_conn()
    try:
        upsert_player(conn, p.tracking_id, p.jersey, p.name, p.team)
        return get_player(conn, p.tracking_id)
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class EventIn(BaseModel):
    frame_no:    int
    event_type:  str
    tracking_id: Optional[int] = None
    jersey:      Optional[str] = None
    play_id:     Optional[str] = None
    notes:       Optional[str] = None


@app.get("/events")
def get_events():
    conn = get_conn()
    try:
        return list_events(conn)
    finally:
        conn.close()


@app.post("/events", status_code=201)
def create_event(ev: EventIn):
    conn = get_conn()
    try:
        new_id = insert_event(
            conn, ev.frame_no, ev.event_type,
            ev.tracking_id, ev.jersey, ev.play_id, ev.notes,
        )
        return {"id": new_id, **ev.model_dump()}
    except ValueError as e:
        raise HTTPException(400, str(e))
    finally:
        conn.close()


@app.delete("/events/{event_id}")
def remove_event(event_id: int):
    conn = get_conn()
    try:
        if not delete_event(conn, event_id):
            raise HTTPException(404, "Event not found")
        return {"deleted": event_id}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Tracking query
# ---------------------------------------------------------------------------

@app.get("/tracking/frame/{frame_no}")
def tracking_at_frame(frame_no: int):
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT t.player_id, t.x_pixel, t.y_pixel, t.x_yards, t.y_yards,
                   p.jersey, p.name, p.team
            FROM tracking t
            LEFT JOIN players p ON p.tracking_id = t.player_id
            WHERE t.frame_no = ?
            ORDER BY t.player_id
            """,
            (frame_no,),
        ).fetchall()
        return [
            {
                "tracking_id": r[0],
                "x_pixel": r[1], "y_pixel": r[2],
                "x_yards": r[3], "y_yards": r[4],
                "jersey": r[5], "name": r[6], "team": r[7],
            }
            for r in rows
        ]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    global _VIDEO_PATH, _DB_PATH

    parser = argparse.ArgumentParser(description="Flag football annotation server")
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--db",    required=True, type=Path)
    parser.add_argument("--host",  default="127.0.0.1")
    parser.add_argument("--port",  default=8000, type=int)
    args = parser.parse_args()

    for p, label in [(args.video, "video"), (args.db, "database")]:
        if not p.exists():
            print(f"Error: {label} not found: {p}", file=sys.stderr)
            sys.exit(1)

    _VIDEO_PATH = args.video
    _DB_PATH    = args.db

    conn = sqlite3.connect(_DB_PATH)
    init_db(conn)
    conn.close()

    print(f"\n  Flag Football Annotator")
    print(f"  Video : {_VIDEO_PATH.name}")
    print(f"  DB    : {_DB_PATH}")
    print(f"  URL   : http://{args.host}:{args.port}\n")

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
