from __future__ import annotations

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Task, Habit, HabitLog, Event, Prayer, FocusSession, ActivityLog, IslamicActivity, QuranProgress
from utils import camelify, today_str

router = APIRouter()


@router.get("/daily-summary")
def get_daily_summary(date: Optional[str] = None, session: Session = Depends(get_session)):
    target_date = date or today_str()
    day_start = datetime.fromisoformat(target_date + "T00:00:00")
    day_end = datetime.fromisoformat(target_date + "T23:59:59")

    tasks_list = session.exec(select(Task).where(Task.due_date == target_date)).all()
    habits_list = session.exec(select(Habit).where(Habit.is_archived == False)).all()
    habit_logs = session.exec(select(HabitLog).where(HabitLog.date == target_date)).all()
    events_list = session.exec(
        select(Event).where(and_(Event.start_time >= day_start, Event.start_time <= day_end))
    ).all()
    prayers_list = session.exec(select(Prayer).where(Prayer.date == target_date)).all()
    focus_list = session.exec(
        select(FocusSession).where(and_(FocusSession.started_at >= day_start, FocusSession.started_at <= day_end))
    ).all()
    deed_logs = session.exec(select(ActivityLog).where(ActivityLog.date == target_date)).all()
    all_deeds = session.exec(select(IslamicActivity).where(IslamicActivity.is_active == True)).all()
    quran_record = session.exec(select(QuranProgress)).first()

    log_map = {l.habit_id: l.status for l in habit_logs}
    deed_name_map = {a.id: a.name for a in all_deeds}

    completed_deed_logs = [l for l in deed_logs if l.status == "completed"]
    completed_deed_names = [deed_name_map.get(l.activity_id, "Unknown Deed") for l in completed_deed_logs]

    summary = {
        "date": target_date,
        "tasks": {
            "total": len(tasks_list),
            "done": sum(1 for t in tasks_list if t.status == "done"),
            "pending": sum(1 for t in tasks_list if t.status == "pending"),
            "completedTitles": [t.title for t in tasks_list if t.status == "done"],
        },
        "habits": {
            "total": len(habits_list),
            "completed": sum(1 for l in habit_logs if l.status == "completed"),
            "skipped": sum(1 for l in habit_logs if l.status == "skipped"),
            "missed": sum(1 for l in habit_logs if l.status == "missed"),
            "completedNames": [h.name for h in habits_list if log_map.get(h.id) == "completed"],
        },
        "prayers": {
            "total": len(prayers_list),
            "onTime": sum(1 for p in prayers_list if p.status == "on_time"),
            "late": sum(1 for p in prayers_list if p.status == "late"),
            "missed": sum(1 for p in prayers_list if p.status == "missed"),
            "pending": sum(1 for p in prayers_list if p.status == "pending"),
        },
        "focus": {
            "totalMinutes": sum(s.duration_minutes for s in focus_list),
            "totalSessions": len(focus_list),
            "completedSessions": sum(1 for s in focus_list if s.status == "completed"),
        },
        "islamic": {
            "deedsTotal": len(all_deeds),
            "deedsCompleted": len(completed_deed_logs),
            "completedDeedNames": completed_deed_names,
            "quranPage": quran_record.current_page if quran_record else None,
            "quranPercent": round(((quran_record.current_page - 1) / (quran_record.total_pages - 1)) * 100) if quran_record else None,
            "quranPagesReadToday": 0,
        },
        "events": [camelify(e.model_dump()) for e in events_list],
    }

    return JSONResponse(content=summary)
