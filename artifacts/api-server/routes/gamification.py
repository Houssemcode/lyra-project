from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, and_, func
from database import get_session
from models import Task, Habit, HabitLog, Prayer, FocusSession, ActivityLog
from utils import camelify, today_str

router = APIRouter()

XP_TASK = 10
XP_HABIT = 15
XP_PRAYER_ONTIME = 20
XP_PRAYER_LATE = 8
XP_FOCUS_PER_MIN = 1
XP_DEED = 12
XP_PER_LEVEL = 200


def level_from_xp(xp: int) -> int:
    return xp // XP_PER_LEVEL + 1


@router.get("/gamification")
def get_gamification(session: Session = Depends(get_session)):
    now = datetime.utcnow()
    today = today_str()
    week_ago = (now - timedelta(days=6)).strftime("%Y-%m-%d")
    today_start = datetime.fromisoformat(today + "T00:00:00")
    week_start = datetime.fromisoformat(week_ago + "T00:00:00")

    task_all = session.exec(select(func.count(Task.id)).where(Task.status == "done")).one()
    habit_all = session.exec(select(func.count(HabitLog.id)).where(HabitLog.status == "completed")).one()
    prayer_ontime_all = session.exec(select(func.count(Prayer.id)).where(Prayer.status == "on_time")).one()
    prayer_late_all = session.exec(select(func.count(Prayer.id)).where(Prayer.status == "late")).one()
    deed_all = session.exec(select(func.count(ActivityLog.id)).where(ActivityLog.status == "completed")).one()

    focus_sessions_all = session.exec(select(FocusSession)).all()
    focus_mins_all = sum(min(s.duration_minutes, 90) for s in focus_sessions_all)

    total_xp = (
        task_all * XP_TASK +
        habit_all * XP_HABIT +
        prayer_ontime_all * XP_PRAYER_ONTIME +
        prayer_late_all * XP_PRAYER_LATE +
        focus_mins_all * XP_FOCUS_PER_MIN +
        deed_all * XP_DEED
    )

    task_today = session.exec(
        select(func.count(Task.id)).where(and_(Task.status == "done", Task.completed_at >= today_start))
    ).one()
    habit_today = session.exec(
        select(func.count(HabitLog.id)).where(and_(HabitLog.status == "completed", HabitLog.date == today))
    ).one()
    prayer_ontime_today = session.exec(
        select(func.count(Prayer.id)).where(and_(Prayer.status == "on_time", Prayer.date == today))
    ).one()
    prayer_late_today = session.exec(
        select(func.count(Prayer.id)).where(and_(Prayer.status == "late", Prayer.date == today))
    ).one()
    deed_today = session.exec(
        select(func.count(ActivityLog.id)).where(and_(ActivityLog.status == "completed", ActivityLog.date == today))
    ).one()

    focus_today_sessions = session.exec(
        select(FocusSession).where(FocusSession.started_at >= today_start)
    ).all()
    focus_mins_today = sum(min(s.duration_minutes, 90) for s in focus_today_sessions)

    t_tasks = task_today * XP_TASK
    t_habits = habit_today * XP_HABIT
    t_prayers = prayer_ontime_today * XP_PRAYER_ONTIME + prayer_late_today * XP_PRAYER_LATE
    t_focus = focus_mins_today * XP_FOCUS_PER_MIN
    t_islamic = deed_today * XP_DEED

    task_week = session.exec(
        select(func.count(Task.id)).where(and_(Task.status == "done", Task.completed_at >= week_start))
    ).one()
    habit_week = session.exec(
        select(func.count(HabitLog.id)).where(and_(HabitLog.status == "completed", HabitLog.date >= week_ago))
    ).one()
    prayer_ontime_week = session.exec(
        select(func.count(Prayer.id)).where(and_(Prayer.status == "on_time", Prayer.date >= week_ago))
    ).one()
    prayer_late_week = session.exec(
        select(func.count(Prayer.id)).where(and_(Prayer.status == "late", Prayer.date >= week_ago))
    ).one()
    deed_week = session.exec(
        select(func.count(ActivityLog.id)).where(and_(ActivityLog.status == "completed", ActivityLog.date >= week_ago))
    ).one()

    focus_week_sessions = session.exec(
        select(FocusSession).where(FocusSession.started_at >= week_start)
    ).all()
    focus_mins_week = sum(min(s.duration_minutes, 90) for s in focus_week_sessions)

    weekly_xp = (
        task_week * XP_TASK +
        habit_week * XP_HABIT +
        prayer_ontime_week * XP_PRAYER_ONTIME +
        prayer_late_week * XP_PRAYER_LATE +
        focus_mins_week * XP_FOCUS_PER_MIN +
        deed_week * XP_DEED
    )

    habits = session.exec(
        select(Habit).where(Habit.is_archived == False)
    ).all()

    level = level_from_xp(total_xp)

    return JSONResponse(content={
        "level": level,
        "totalXp": total_xp,
        "currentLevelXp": total_xp % XP_PER_LEVEL,
        "nextLevelXp": XP_PER_LEVEL,
        "todayScore": {
            "total": t_tasks + t_habits + t_prayers + t_focus + t_islamic,
            "tasks": t_tasks,
            "habits": t_habits,
            "prayers": t_prayers,
            "focus": t_focus,
            "islamic": t_islamic,
        },
        "weeklyXp": weekly_xp,
        "habitStreaks": [
            {"habitId": h.id, "name": h.name, "streak": h.streak, "bestStreak": h.best_streak}
            for h in habits
        ],
    })
