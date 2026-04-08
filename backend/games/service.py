"""
Game CRUD operations against the app SQLite db.
"""

from __future__ import annotations

import sqlite3
from typing import Optional


def create_game(conn: sqlite3.Connection, user_id: int, name: str, **kwargs) -> dict:
    fields = ["user_id", "name"] + list(kwargs.keys())
    placeholders = ", ".join(["?"] * len(fields))
    values = [user_id, name] + list(kwargs.values())
    cur = conn.execute(
        f"INSERT INTO games ({', '.join(fields)}) VALUES ({placeholders})",
        values,
    )
    conn.commit()
    return get_game(conn, cur.lastrowid)


def get_game(conn: sqlite3.Connection, game_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    return dict(row) if row else None


def list_games(conn: sqlite3.Connection, user_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def update_game(conn: sqlite3.Connection, game_id: int, **kwargs) -> dict | None:
    if not kwargs:
        return get_game(conn, game_id)
    kwargs["updated_at"] = "datetime('now')"
    set_clauses = []
    values = []
    for k, v in kwargs.items():
        if k == "updated_at":
            set_clauses.append(f"{k} = datetime('now')")
        else:
            set_clauses.append(f"{k} = ?")
            values.append(v)
    values.append(game_id)
    conn.execute(f"UPDATE games SET {', '.join(set_clauses)} WHERE id = ?", values)
    conn.commit()
    return get_game(conn, game_id)


def delete_game(conn: sqlite3.Connection, game_id: int) -> bool:
    cur = conn.execute("DELETE FROM games WHERE id = ?", (game_id,))
    conn.commit()
    return cur.rowcount > 0


def set_game_status(
    conn: sqlite3.Connection,
    game_id: int,
    status: str,
    progress: int = 0,
    error: Optional[str] = None,
) -> None:
    conn.execute(
        """
        UPDATE games
        SET status = ?, progress = ?, pipeline_error = ?, updated_at = datetime('now')
        WHERE id = ?
        """,
        (status, progress, error, game_id),
    )
    conn.commit()


def update_progress(conn: sqlite3.Connection, game_id: int, progress: int) -> None:
    conn.execute(
        "UPDATE games SET progress = ?, updated_at = datetime('now') WHERE id = ?",
        (progress, game_id),
    )
    conn.commit()
