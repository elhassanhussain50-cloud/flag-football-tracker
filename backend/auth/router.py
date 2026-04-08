"""
Auth routes: /auth/login, /auth/logout, /auth/register, /auth/me
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from jose import JWTError

from ..db import get_conn
from ..deps import get_current_user
from .models import LoginRequest, RegisterRequest, TokenPayload
from .service import (
    create_jwt,
    create_user,
    get_user_by_email,
    verify_password,
)

router = APIRouter(tags=["auth"])

COOKIE_NAME = "snaptag_token"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days


@router.post("/register", status_code=201)
def register(body: RegisterRequest, response: Response):
    conn = get_conn()
    try:
        if get_user_by_email(conn, body.email):
            raise HTTPException(409, "Email already registered")
        user = create_user(conn, body.email, body.password)
        token = create_jwt(user["id"], user["email"])
        response.set_cookie(
            COOKIE_NAME,
            token,
            max_age=COOKIE_MAX_AGE,
            httponly=True,
            samesite="lax",
            path="/",
        )
        return {"user_id": user["id"], "email": user["email"]}
    finally:
        conn.close()


@router.post("/login")
def login(body: LoginRequest, response: Response):
    conn = get_conn()
    try:
        user = get_user_by_email(conn, body.email)
        if not user or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(401, "Invalid email or password")
        token = create_jwt(user["id"], user["email"])
        response.set_cookie(
            COOKIE_NAME,
            token,
            max_age=COOKIE_MAX_AGE,
            httponly=True,
            samesite="lax",
            path="/",
        )
        return {"user_id": user["id"], "email": user["email"]}
    finally:
        conn.close()


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(current_user: TokenPayload = Depends(get_current_user)):
    return {"user_id": current_user.user_id, "email": current_user.email}
