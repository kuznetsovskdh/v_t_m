import asyncio
import json
import os
from typing import Dict, Set

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from auth import get_password_hash
from database import engine
from models import Base
from routes.auth import router as auth_router
from routes.pipeline import router as pipeline_router
from routes.projects import router as projects_router
from routes.votes import router as votes_router


def parse_cors_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000"]
    return [v.strip() for v in value.split(",") if v.strip()]


class WSManager:
    def __init__(self) -> None:
        self.connections: Dict[int, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()
        self.voting_complete_sent: Set[int] = set()

    async def connect(self, project_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self.lock:
            self.connections.setdefault(project_id, set()).add(websocket)

    async def disconnect(self, project_id: int, websocket: WebSocket) -> None:
        async with self.lock:
            conns = self.connections.get(project_id)
            if conns and websocket in conns:
                conns.remove(websocket)
            if conns is not None and len(conns) == 0:
                self.connections.pop(project_id, None)

    async def broadcast(self, project_id: int, payload: dict) -> None:
        message = json.dumps(payload, ensure_ascii=False)
        async with self.lock:
            conns = list(self.connections.get(project_id, set()))
        # Send outside lock to avoid blocking other operations.
        for ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                await self.disconnect(project_id, ws)


app = FastAPI(title="Jury Voting MVP")

cors_origins = parse_cors_origins(os.getenv("CORS_ORIGINS"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ws_manager = WSManager()
app.state.ws_manager = ws_manager

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(votes_router)
app.include_router(pipeline_router)


@app.on_event("startup")
async def on_startup() -> None:
    # Useful for local runs without init.sql (Docker already creates schema).
    test_password_hash = get_password_hash("1111")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Allow vote history: drop unique index if it exists (older schema).
        try:
            await conn.execute(text("ALTER TABLE votes DROP INDEX uq_user_project_criteria"))
        except Exception:
            pass
        # Keep demo credentials stable even with persisted DB volumes.
        await conn.execute(
            text(
                """
                INSERT INTO users (username, password_hash, display_name, color)
                VALUES
                  ('judge1', :password_hash, 'Эксперт 1', '#FF6B6B'),
                  ('judge2', :password_hash, 'Эксперт 2', '#4ECDC4'),
                  ('judge3', :password_hash, 'Эксперт 3', '#FFE66D')
                ON DUPLICATE KEY UPDATE
                  password_hash = VALUES(password_hash),
                  display_name = VALUES(display_name),
                  color = VALUES(color)
                """
            ),
            {"password_hash": test_password_hash},
        )


@app.websocket("/ws/{project_id}")
async def ws_project(project_id: int, websocket: WebSocket) -> None:
    await ws_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep the websocket alive; frontend doesn't need to send anything.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(project_id, websocket)
    except Exception:
        await ws_manager.disconnect(project_id, websocket)

