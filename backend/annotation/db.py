"""
Annotation database — events and player jersey assignments.
Attaches to the same tracking.db so everything stays in one file.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

CREATE_PLAYERS = """
CREATE TABLE IF NOT EXISTS players (
    tracking_id  INTEGER PRIMARY KEY,
    jersey       TEXT,
    name         TEXT,
    team         TEXT
);
"""

CREATE_EVENTS = """
CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    frame_no    INTEGER NOT NULL,
    event_type  TEXT NOT NULL,
    tracking_id INTEGER,
    jersey      TEXT,
    play_id     TEXT,
    notes       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);
"""

CREATE_EVENTS_INDEX = """
CREATE INDEX IF NOT EXISTS idx_events_frame ON events (frame_no);
"""

EVENT_TYPES = {"PASS", "CATCH", "FLAG_PULL", "TOUCHDOWN", "INCOMPLETE", "ROUTE"}


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(CREATE_PLAYERS)
    conn.execute(CREATE_EVENTS)
    conn.execute(CREATE_EVENTS_INDEX)
    conn.commit()


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

def upsert_player(
    conn: sqlite3.Connection,
    tracking_id: int,
    jersey: str | None = None,
    name: str | None = None,
    team: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO players (tracking_id, jersey, name, team)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tracking_id) DO UPDATE SET
            jersey = COALESCE(excluded.jersey, jersey),
            name   = COALESCE(excluded.name,   name),
            team   = COALESCE(excluded.team,   team)
        """,
        (tracking_id, jersey, name, team),
    )
    conn.commit()


def list_players(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.execute(
        "SELECT tracking_id, jersey, name, team FROM players ORDER BY CAST(jersey AS INTEGER)"
    )
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def get_player(conn: sqlite3.Connection, tracking_id: int) -> dict | None:
    cur = conn.execute(
        "SELECT tracking_id, jersey, name, team FROM players WHERE tracking_id = ?",
        (tracking_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return dict(zip([d[0] for d in cur.description], row))


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

def insert_event(
    conn: sqlite3.Connection,
    frame_no: int,
    event_type: str,
    tracking_id: int | None = None,
    jersey: str | None = None,
    play_id: str | None = None,
    notes: str | None = None,
) -> int:
    event_type = event_type.upper()
    if event_type not in EVENT_TYPES:
        raise ValueError(f"Unknown event type '{event_type}'. Must be one of {EVENT_TYPES}")
    cur = conn.execute(
        """
        INSERT INTO events (frame_no, event_type, tracking_id, jersey, play_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (frame_no, event_type, tracking_id, jersey, play_id, notes),
    )
    conn.commit()
    return cur.lastrowid


def list_events(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.execute(
        """
        SELECT e.id, e.frame_no, e.event_type, e.tracking_id, e.jersey,
               e.play_id, e.notes, e.created_at
        FROM events e
        ORDER BY e.frame_no
        """
    )
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def delete_event(conn: sqlite3.Connection, event_id: int) -> bool:
    cur = conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
    conn.commit()
    return cur.rowcount > 0
