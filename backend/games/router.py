"""
Games routes — CRUD, video upload, pipeline trigger, annotation.
"""

from __future__ import annotations

import shutil
import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..annotation.db import (
    delete_event as _delete_event,
    get_player,
    init_db as _init_annotation_db,
    insert_event,
    list_events,
    list_players,
    upsert_player,
)
from ..db import APP_DB_PATH, get_conn
from ..deps import get_current_user
from ..auth.models import TokenPayload
from ..pipeline.worker import run_pipeline
from .models import GameCreate, GameOut, GameStatus, GameUpdate
from .service import (
    create_game,
    delete_game,
    get_game,
    list_games,
    set_game_status,
    update_game,
)
from pydantic import BaseModel

router = APIRouter(tags=["games"])

DATA_DIR = Path(__file__).parent.parent.parent / "data"
VIDEOS_DIR = DATA_DIR / "videos"
OUTPUTS_DIR = DATA_DIR / "outputs"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_game_or_404(conn: sqlite3.Connection, game_id: int, user_id: int) -> dict:
    game = get_game(conn, game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["user_id"] != user_id:
        raise HTTPException(403, "Not your game")
    return game


def _open_game_db(game: dict) -> sqlite3.Connection:
    if not game.get("db_path"):
        raise HTTPException(400, "Game has no tracking database yet. Run the pipeline first.")
    db_path = Path(game["db_path"])
    if not db_path.exists():
        raise HTTPException(400, "Tracking database not found.")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


# ---------------------------------------------------------------------------
# Games CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[GameOut])
def list_user_games(current_user: TokenPayload = Depends(get_current_user)):
    conn = get_conn()
    try:
        return list_games(conn, current_user.user_id)
    finally:
        conn.close()


@router.post("", response_model=GameOut, status_code=201)
def create_new_game(
    body: GameCreate,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = create_game(
            conn,
            user_id=current_user.user_id,
            name=body.name,
            game_date=body.game_date,
            location=body.location,
            home_team=body.home_team,
            away_team=body.away_team,
        )
        return game
    finally:
        conn.close()


@router.get("/{game_id}", response_model=GameOut)
def get_game_detail(
    game_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        return _get_game_or_404(conn, game_id, current_user.user_id)
    finally:
        conn.close()


@router.patch("/{game_id}", response_model=GameOut)
def patch_game(
    game_id: int,
    body: GameUpdate,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        _get_game_or_404(conn, game_id, current_user.user_id)
        updates = body.model_dump(exclude_none=True)
        return update_game(conn, game_id, **updates)
    finally:
        conn.close()


@router.delete("/{game_id}")
def remove_game(
    game_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        # Clean up files
        if game.get("video_path"):
            p = Path(game["video_path"])
            if p.exists():
                p.unlink()
        output_dir = OUTPUTS_DIR / str(game_id)
        if output_dir.exists():
            shutil.rmtree(output_dir)
        delete_game(conn, game_id)
        return {"deleted": game_id}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Video upload
# ---------------------------------------------------------------------------

@router.post("/{game_id}/upload", response_model=GameOut)
async def upload_video(
    game_id: int,
    file: UploadFile,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
        dest = VIDEOS_DIR / f"{game_id}_{file.filename}"
        with dest.open("wb") as f:
            content = await file.read()
            f.write(content)
        game = update_game(conn, game_id, video_path=str(dest), status="UPLOADED")
        return game
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Pipeline trigger + status
# ---------------------------------------------------------------------------

@router.post("/{game_id}/process")
def process_game(
    game_id: int,
    background_tasks: BackgroundTasks,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        if game["status"] not in ("UPLOADED", "ERROR", "PROCESSING"):
            raise HTTPException(400, f"Cannot process game in status '{game['status']}'")
        if not game.get("video_path"):
            raise HTTPException(400, "Upload a video first")

        # Set up per-game output dir and db path
        output_dir = OUTPUTS_DIR / str(game_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        db_path = output_dir / "tracking.db"

        set_game_status(conn, game_id, "PROCESSING")
        update_game(conn, game_id, db_path=str(db_path))
        background_tasks.add_task(run_pipeline, game_id, str(APP_DB_PATH))
        return {"status": "PROCESSING"}
    finally:
        conn.close()


@router.get("/{game_id}/status", response_model=GameStatus)
def game_status(
    game_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        return {
            "status": game["status"],
            "progress": game["progress"] or 0,
            "pipeline_error": game.get("pipeline_error"),
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Video streaming
# ---------------------------------------------------------------------------

@router.get("/{game_id}/video")
def stream_video(
    game_id: int,
):
    # No auth check — video is only reachable from within the logged-in app
    conn = get_conn()
    try:
        game = get_game(conn, game_id)
        if not game or not game.get("video_path") or not Path(game["video_path"]).exists():
            raise HTTPException(404, "Video not found")
        return FileResponse(game["video_path"], media_type="video/mp4")
    finally:
        conn.close()


@router.get("/{game_id}/info")
def game_info(
    game_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            total_frames = gconn.execute(
                "SELECT MAX(frame_no) FROM tracking"
            ).fetchone()[0] or 0
            return {"video": Path(game["video_path"]).name, "total_frames": total_frames}
        finally:
            gconn.close()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Tracking query
# ---------------------------------------------------------------------------

@router.get("/{game_id}/tracking/frame/{frame_no}")
def tracking_at_frame(
    game_id: int,
    frame_no: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            rows = gconn.execute(
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
            gconn.close()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Players (annotation)
# ---------------------------------------------------------------------------

class PlayerIn(BaseModel):
    tracking_id: int
    jersey: Optional[str] = None
    name: Optional[str] = None
    team: Optional[str] = None


@router.get("/{game_id}/players")
def get_players(
    game_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            return list_players(gconn)
        finally:
            gconn.close()
    finally:
        conn.close()


@router.post("/{game_id}/players", status_code=201)
def set_player(
    game_id: int,
    p: PlayerIn,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            upsert_player(gconn, p.tracking_id, p.jersey, p.name, p.team)
            return get_player(gconn, p.tracking_id)
        finally:
            gconn.close()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Events (annotation)
# ---------------------------------------------------------------------------

class EventIn(BaseModel):
    frame_no: int
    event_type: str
    tracking_id: Optional[int] = None
    jersey: Optional[str] = None
    play_id: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{game_id}/events")
def get_events(
    game_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            return list_events(gconn)
        finally:
            gconn.close()
    finally:
        conn.close()


@router.post("/{game_id}/events", status_code=201)
def create_event(
    game_id: int,
    ev: EventIn,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            new_id = insert_event(
                gconn, ev.frame_no, ev.event_type,
                ev.tracking_id, ev.jersey, ev.play_id, ev.notes,
            )
            return {"id": new_id, **ev.model_dump()}
        except ValueError as e:
            raise HTTPException(400, str(e))
        finally:
            gconn.close()
    finally:
        conn.close()


@router.delete("/{game_id}/events/{event_id}")
def remove_event(
    game_id: int,
    event_id: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    conn = get_conn()
    try:
        game = _get_game_or_404(conn, game_id, current_user.user_id)
        gconn = _open_game_db(game)
        try:
            if not _delete_event(gconn, event_id):
                raise HTTPException(404, "Event not found")
            return {"deleted": event_id}
        finally:
            gconn.close()
    finally:
        conn.close()
