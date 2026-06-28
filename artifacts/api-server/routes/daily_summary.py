from __future__ import annotations

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, and_
from database import get_session
from models import Task, Habit, HabitLog, CalendarEvent, PrayerLog, FocusSession, ActivityLog, IslamicActivity, Khatmah
from utils import today_str
from routes.events import serialize_event
from clerk_auth import get_current_user_id

router = APIRouter()


@router.get("/daily-summary")
def get_daily_summary(
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    target_date = date or today_str()
    day_start = datetime.fromisoformat(target_date + "T00:00:00")
    day_end = datetime.fromisoformat(target_date + "T23:59:59")

    tasks_list = session.exec(
        select(Task).where(and_(Task.user_id == user_id, Task.start_time >= day_start, Task.start_time <= day_end, Task.is_archived == False))
    ).all()
    habits_list = session.exec(select(Habit).where(Habit.user_id == user_id, Habit.is_archived == False)).all()
    habit_ids = [h.id for h in habits_list]
    habit_logs = session.exec(
        select(HabitLog).where(HabitLog.habit_id.in_(habit_ids), HabitLog.date == target_date)
    ).all() if habit_ids else []
    events_list = session.exec(
        select(CalendarEvent).where(and_(CalendarEvent.user_id == user_id, CalendarEvent.start_time >= day_start, CalendarEvent.start_time <= day_end))
    ).all()
    prayers_list = session.exec(select(PrayerLog).where(PrayerLog.user_id == user_id, PrayerLog.date == target_date)).all()
    focus_list = session.exec(
        select(FocusSession).where(and_(FocusSession.user_id == user_id, FocusSession.started_at >= day_start, FocusSession.started_at <= day_end))
    ).all()
    deed_logs = session.exec(
        select(ActivityLog).where(and_(ActivityLog.user_id == user_id, ActivityLog.logged_at >= day_start, ActivityLog.logged_at <= day_end))
    ).all()
    all_deeds = session.exec(select(IslamicActivity).where(IslamicActivity.is_archived == False)).all()
    khatmah = session.exec(select(Khatmah).where(Khatmah.user_id == user_id, Khatmah.is_archived == False)).first()

    log_map = {lg.habit_id: lg.status for lg in habit_logs}
    deed_name_map = {a.id: a.name for a in all_deeds}

    completed_deed_logs = [lg for lg in deed_logs if lg.status == "Completed"]
    completed_deed_names = [deed_name_map.get(lg.activity_id, "Unknown Deed") for lg in completed_deed_logs]

    summary = {
        "date": target_date,
        "tasks": {
            "total": len(tasks_list),
            "done": sum(1 for t in tasks_list if t.status == "Done"),
            "pending": sum(1 for t in tasks_list if t.status == "Pending"),
            "completedTitles": [t.title for t in tasks_list if t.status == "Done"],
        },
        "habits": {
            "total": len(habits_list),
            "completed": sum(1 for lg in habit_logs if lg.status == "Completed"),
            "skipped": sum(1 for lg in habit_logs if lg.status == "Skipped"),
            "missed": sum(1 for lg in habit_logs if lg.status == "Failed"),
            "completedNames": [h.name for h in habits_list if log_map.get(h.id) == "Completed"],
        },
        "prayers": {
            "total": len(prayers_list),
            "onTime": sum(1 for p in prayers_list if p.status == "On_Time"),
            "late": sum(1 for p in prayers_list if p.status == "Late"),
            "missed": sum(1 for p in prayers_list if p.status == "Missed"),
            "pending": sum(1 for p in prayers_list if p.status is None),
        },
        "focus": {
            "totalMinutes": sum(s.actual_duration or 0 for s in focus_list),
            "totalSessions": len(focus_list),
            "completedSessions": sum(1 for s in focus_list if s.status == "Completed"),
        },
        "islamic": {
            "deedsTotal": len(all_deeds),
            "deedsCompleted": len(completed_deed_logs),
            "completedDeedNames": completed_deed_names,
            "quranPage": khatmah.current_page if khatmah else None,
            "quranPercent": round((khatmah.current_page / khatmah.total_pages) * 100) if khatmah else None,
            "quranPagesReadToday": 0,
        },
        "events": [serialize_event(e) for e in events_list],
    }

    return JSONResponse(content=summary)
