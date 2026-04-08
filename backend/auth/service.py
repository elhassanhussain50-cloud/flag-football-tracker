"""
Password hashing and JWT utilities.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from .models import TokenPayload

JWT_SECRET = os.environ.get("SNAPTAG_JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_jwt(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> TokenPayload:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return TokenPayload(user_id=int(payload["sub"]), email=payload["email"])


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_user_by_email(conn: sqlite3.Connection, email: str) -> dict | None:
    row = conn.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?", (email,)
    ).fetchone()
    return dict(row) if row else None


def create_user(conn: sqlite3.Connection, email: str, password: str) -> dict:
    cur = conn.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (email, hash_password(password)),
    )
    conn.commit()
    return {"id": cur.lastrowid, "email": email}
