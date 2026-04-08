"""
SnapTag — FastAPI application entry point.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_app_db
from .auth.router import router as auth_router
from .games.router import router as games_router

app = FastAPI(title="SnapTag API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_app_db()


app.include_router(auth_router, prefix="/auth")
app.include_router(games_router, prefix="/games")
