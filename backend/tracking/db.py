"""
SQLite schema and writer for player tracking data.
"""

import sqlite3
from pathlib import Path
from typing import Iterable


CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS tracking (
    frame_no   INTEGER NOT NULL,
    player_id  INTEGER NOT NULL,
    x_pixel    REAL,
    y_pixel    REAL,
    confidence REAL,
    x_yards    REAL,
    y_yards    REAL,
    PRIMARY KEY (frame_no, player_id)
);
"""

CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_player_frame
    ON tracking (player_id, frame_no);
"""


def init_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute(CREATE_TABLE)
    conn.execute(CREATE_INDEX)
    conn.commit()
    return conn


def insert_rows(conn: sqlite3.Connection, rows: Iterable[tuple]) -> None:
    """
    Insert a batch of tracking rows.

    Each row: (frame_no, player_id, x_pixel, y_pixel, confidence, x_yards, y_yards)
    """
    conn.executemany(
        """
        INSERT OR REPLACE INTO tracking
            (frame_no, player_id, x_pixel, y_pixel, confidence, x_yards, y_yards)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()


def export_csv(conn: sqlite3.Connection, csv_path: Path) -> None:
    import csv

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    cur = conn.execute(
        "SELECT frame_no, player_id, x_pixel, y_pixel, confidence, x_yards, y_yards "
        "FROM tracking ORDER BY frame_no, player_id"
    )
    with csv_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["frame_no", "player_id", "x_pixel", "y_pixel",
                         "confidence", "x_yards", "y_yards"])
        writer.writerows(cur)
