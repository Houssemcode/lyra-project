from __future__ import annotations

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text
from sqlmodel import Session
import httpx

from database import create_db_and_tables, engine
from seed import seed_islamic_activities, seed_routines
from routes import tasks, habits, events, prayers, focus, islamic, settings, gamification, reports, daily_summary, export

BASE_PATH = os.getenv("BASE_PATH", "/api")

app = FastAPI(title="Lyra API", root_path=BASE_PATH, docs_url="/docs", openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _migrate_add_user_id() -> None:
    statements = [
        'ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE "Habit" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE "FocusSession" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE "PrayerLog" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE "Khatmah" ADD COLUMN IF NOT EXISTS user_id VARCHAR',
        'ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id VARCHAR',
    ]
    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass
        conn.commit()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    _migrate_add_user_id()
    with Session(engine) as session:
        seed_routines(session)
        seed_islamic_activities(session)


@app.get("/healthz")
def healthz():
    return JSONResponse(content={"status": "ok"})


app.include_router(tasks.router)
app.include_router(habits.router)
app.include_router(events.router)
app.include_router(prayers.router)
app.include_router(focus.router)
app.include_router(islamic.router)
app.include_router(settings.router)
app.include_router(gamification.router)
app.include_router(reports.router)
app.include_router(daily_summary.router)
app.include_router(export.router)
