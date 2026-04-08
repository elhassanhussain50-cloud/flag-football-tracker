from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class GameCreate(BaseModel):
    name: str
    game_date: Optional[str] = None
    location: Optional[str] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None


class GameUpdate(BaseModel):
    name: Optional[str] = None
    game_date: Optional[str] = None
    location: Optional[str] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None


class GameOut(BaseModel):
    id: int
    user_id: int
    name: str
    game_date: Optional[str]
    location: Optional[str]
    home_team: Optional[str]
    away_team: Optional[str]
    video_path: Optional[str]
    status: str
    progress: int
    pipeline_error: Optional[str]
    created_at: str
    updated_at: str


class GameStatus(BaseModel):
    status: str
    progress: int
    pipeline_error: Optional[str]
