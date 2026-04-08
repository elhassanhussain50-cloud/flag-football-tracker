"""
Pipeline background worker — wraps tracking/pipeline.py for use with FastAPI BackgroundTasks.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure backend root is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from ..annotation.db import init_db as init_annotation_db
from ..tracking.db import init_db as init_tracking_db
from ..db import get_conn
from ..games.service import set_game_status, update_game, update_progress


def run_pipeline(game_id: int, app_db_path: str) -> None:
    """
    Run the YOLOv8 tracking pipeline for a game.
    Called by FastAPI BackgroundTasks — must not raise (errors are persisted to DB).
    """
    from pathlib import Path as _Path
    from ..db import get_conn as _get_conn

    app_conn = _get_conn(_Path(app_db_path))

    try:
        game = dict(app_conn.execute(
            "SELECT * FROM games WHERE id = ?", (game_id,)
        ).fetchone())

        video_path = _Path(game["video_path"])
        db_path = _Path(game["db_path"])

        if not video_path.exists():
            set_game_status(app_conn, game_id, "ERROR", error=f"Video not found: {video_path}")
            return

        # Initialise per-game tracking db
        tracking_conn = init_tracking_db(db_path)
        init_annotation_db(tracking_conn)

        def progress_cb(frame: int, total: int) -> None:
            pct = int(frame / max(total, 1) * 100)
            update_progress(app_conn, game_id, pct)

        # Import here so the heavy dependencies (ultralytics, cv2) are only loaded
        # when the worker actually runs, not at server startup.
        from ..tracking.pipeline import track
        from ..config import DEFAULT_HOMOGRAPHY_PATH

        # Use the default homography if no game-specific one has been set
        homography_path = (
            _Path(game["homography_path"])
            if game.get("homography_path")
            else DEFAULT_HOMOGRAPHY_PATH
        )

        track(
            video_path=video_path,
            homography_path=homography_path,
            conn=tracking_conn,
            progress_cb=progress_cb,
        )
        tracking_conn.close()

        set_game_status(app_conn, game_id, "READY", progress=100)

    except Exception as exc:
        set_game_status(app_conn, game_id, "ERROR", error=str(exc))
    finally:
        app_conn.close()
