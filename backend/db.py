"""
Central app database — users and games tables.
Per-game tracking data lives in separate SQLite files under data/outputs/{game_id}/.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

APP_DB_PATH = Path(__file__).parent.parent / "data" / "snaptag.db"

CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
);
"""

CREATE_GAMES = """
CREATE TABLE IF NOT EXISTS games (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    name            TEXT NOT NULL,
    game_date       TEXT,
    location        TEXT,
    home_team       TEXT,
    away_team       TEXT,
    video_path      TEXT,
    homography_path TEXT,
    db_path         TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    progress        INTEGER DEFAULT 0,
    pipeline_error  TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
"""

CREATE_GAMES_INDEX = """
CREATE INDEX IF NOT EXISTS idx_games_user ON games (user_id);
"""


def init_app_db(db_path: Path = APP_DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute(CREATE_USERS)
    conn.execute(CREATE_GAMES)
    conn.execute(CREATE_GAMES_INDEX)
    conn.commit()
    conn.close()


def get_conn(db_path: Path = APP_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn
