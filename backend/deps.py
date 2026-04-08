"""
FastAPI shared dependencies.
"""

from __future__ import annotations

from fastapi import HTTPException, Request
from jose import JWTError

from .auth.models import TokenPayload
from .auth.service import decode_jwt


def get_current_user(request: Request) -> TokenPayload:
    token = request.cookies.get("snaptag_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        return decode_jwt(token)
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
