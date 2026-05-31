from __future__ import annotations

import json
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from database import get_session
from models import (
    Task, Habit, HabitLog, Event, Prayer, FocusSession,
    QuranProgress, IslamicActivity, ActivityLog, UserSettings
)
from utils import camelify

router = APIRouter()


@router.get("/export")
def export_data(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task).order_by(Task.created_at)).all()
    habits = session.exec(select(Habit).order_by(Habit.created_at)).all()
    habit_logs = session.exec(select(HabitLog).order_by(HabitLog.logged_at)).all()
    events = session.exec(select(Event).order_by(Event.created_at)).all()
    prayers = session.exec(select(Prayer).order_by(Prayer.date)).all()
    focus_sessions = session.exec(select(FocusSession).order_by(FocusSession.started_at)).all()
    quran_rows = session.exec(select(QuranProgress)).first()
    islamic_activities = session.exec(select(IslamicActivity).order_by(IslamicActivity.created_at)).all()
    activity_logs = session.exec(select(ActivityLog).order_by(ActivityLog.logged_at)).all()
    settings = session.exec(select(UserSettings)).first()

    def serialize_task(t: Task):
        d = camelify(t.model_dump())
        d["tags"] = json.loads(t.tags) if isinstance(t.tags, str) else (t.tags or [])
        return d

    payload = {
        "exportedAt": datetime.utcnow().isoformat() + "Z",
        "version": "1.0",
        "app": "Lyra",
        "data": {
            "settings": camelify(settings.model_dump()) if settings else None,
            "tasks": [serialize_task(t) for t in tasks],
            "habits": [camelify(h.model_dump()) for h in habits],
            "habitLogs": [camelify(l.model_dump()) for l in habit_logs],
            "events": [camelify(e.model_dump()) for e in events],
            "prayers": [camelify(p.model_dump()) for p in prayers],
            "focusSessions": [camelify(s.model_dump()) for s in focus_sessions],
            "quranProgress": camelify(quran_rows.model_dump()) if quran_rows else None,
            "islamicActivities": [camelify(a.model_dump()) for a in islamic_activities],
            "activityLogs": [camelify(l.model_dump()) for l in activity_logs],
        },
    }

    return JSONResponse(content=payload)
