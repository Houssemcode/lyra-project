from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from database import get_session
from models import (
    Task, Habit, HabitLog, CalendarEvent, PrayerLog, FocusSession,
    Khatmah, IslamicActivity, ActivityLog, UserSettings
)
from utils import camelify
from routes.tasks import serialize_task
from routes.habits import serialize_habit
from routes.events import serialize_event
from routes.prayers import serialize_prayer
from routes.focus import serialize_session
from routes.islamic import serialize_khatmah, serialize_deed, serialize_log

router = APIRouter()


@router.get("/export")
def export_data(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task).order_by(Task.created_at)).all()
    habits = session.exec(select(Habit).order_by(Habit.created_at)).all()
    habit_logs = session.exec(select(HabitLog).order_by(HabitLog.logged_at)).all()
    events = session.exec(select(CalendarEvent).order_by(CalendarEvent.created_at)).all()
    prayers = session.exec(select(PrayerLog).order_by(PrayerLog.date)).all()
    focus_sessions = session.exec(select(FocusSession).order_by(FocusSession.started_at)).all()
    khatmah = session.exec(select(Khatmah).where(Khatmah.is_archived == False)).first()
    islamic_activities = session.exec(select(IslamicActivity).order_by(IslamicActivity.created_at)).all()
    activity_logs = session.exec(select(ActivityLog).order_by(ActivityLog.logged_at)).all()
    settings = session.exec(select(UserSettings)).first()

    payload = {
        "exportedAt": datetime.utcnow().isoformat() + "Z",
        "version": "2.0",
        "app": "Lyra",
        "data": {
            "settings": camelify(settings.model_dump()) if settings else None,
            "tasks": [serialize_task(t, session) for t in tasks],
            "habits": [serialize_habit(h, session) for h in habits],
            "habitLogs": [camelify(lg.model_dump()) for lg in habit_logs],
            "events": [serialize_event(e) for e in events],
            "prayers": [serialize_prayer(p) for p in prayers],
            "focusSessions": [serialize_session(s, session) for s in focus_sessions],
            "khatmah": serialize_khatmah(khatmah) if khatmah else None,
            "islamicActivities": [serialize_deed(a) for a in islamic_activities],
            "activityLogs": [serialize_log(lg) for lg in activity_logs],
        },
    }

    return JSONResponse(content=payload)
