from __future__ import annotations

from datetime import datetime, timedelta, date as date_cls
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, and_
from database import get_session
from models import Task, Habit, HabitLog, PrayerLog, FocusSession, ActivityLog
from utils import today_str

router = APIRouter()

XP_TASK = 10
XP_HABIT = 15
XP_PRAYER_ONTIME = 20
XP_PRAYER_LATE = 8
XP_FOCUS_PER_MIN = 1
XP_DEED = 12


def get_week_bounds(anchor: date_cls):
    dow = anchor.isoweekday() % 7
    monday = anchor - timedelta(days=(dow - 1) % 7)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def get_month_bounds(anchor: date_cls):
    start = anchor.replace(day=1)
    if anchor.month == 12:
        end = anchor.replace(year=anchor.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = anchor.replace(month=anchor.month + 1, day=1) - timedelta(days=1)
    return start, end


def date_range(start: date_cls, end: date_cls):
    days = []
    cur = start
    while cur <= end:
        days.append(cur.isoformat())
        cur += timedelta(days=1)
    return days


@router.get("/reports")
def get_report(
    period: Optional[str] = "weekly",
    date: Optional[str] = None,
    session: Session = Depends(get_session),
):
    anchor = date_cls.fromisoformat(date) if date else date_cls.today()
    if period == "monthly":
        start, end = get_month_bounds(anchor)
    else:
        start, end = get_week_bounds(anchor)
        period = "weekly"

    start_str = start.isoformat()
    end_str = end.isoformat()
    start_ts = datetime.fromisoformat(start_str + "T00:00:00")
    end_ts = datetime.fromisoformat(end_str + "T23:59:59")
    days = date_range(start, end)

    completed_tasks = session.exec(
        select(Task).where(
            and_(Task.status == "Done", Task.completed_at >= start_ts, Task.completed_at <= end_ts)
        )
    ).all()

    habit_logs = session.exec(
        select(HabitLog).where(and_(HabitLog.date >= start_str, HabitLog.date <= end_str))
    ).all()

    prayers = session.exec(
        select(PrayerLog).where(and_(PrayerLog.date >= start_str, PrayerLog.date <= end_str))
    ).all()

    focus_sessions = session.exec(
        select(FocusSession).where(
            and_(FocusSession.started_at >= start_ts, FocusSession.started_at <= end_ts)
        )
    ).all()

    deed_logs = session.exec(
        select(ActivityLog).where(
            and_(ActivityLog.logged_at >= start_ts, ActivityLog.logged_at <= end_ts)
        )
    ).all()

    all_habits = session.exec(select(Habit).where(Habit.is_archived == False)).all()
    total_habits = len(all_habits)

    tasks_by_day: dict = {}
    for t in completed_tasks:
        if t.completed_at:
            d = t.completed_at.strftime("%Y-%m-%d")
            tasks_by_day[d] = tasks_by_day.get(d, 0) + 1

    habit_day_map: dict = {}
    for lg in habit_logs:
        if lg.date not in habit_day_map:
            habit_day_map[lg.date] = {"completed": set(), "logged": set()}
        habit_day_map[lg.date]["logged"].add(lg.habit_id)
        if lg.status == "Completed":
            habit_day_map[lg.date]["completed"].add(lg.habit_id)

    habit_completed_days: dict = {}
    for lg in habit_logs:
        if lg.status == "Completed":
            habit_completed_days[lg.habit_id] = habit_completed_days.get(lg.habit_id, 0) + 1

    prayer_day_map: dict = {}
    for p in prayers:
        if p.date not in prayer_day_map:
            prayer_day_map[p.date] = {"on_time": 0, "late": 0, "missed": 0}
        if p.status == "On_Time":
            prayer_day_map[p.date]["on_time"] += 1
        elif p.status == "Late":
            prayer_day_map[p.date]["late"] += 1
        elif p.status == "Missed":
            prayer_day_map[p.date]["missed"] += 1

    focus_day_map: dict = {}
    for s in focus_sessions:
        d = s.started_at.strftime("%Y-%m-%d")
        if d not in focus_day_map:
            focus_day_map[d] = {"minutes": 0, "sessions": 0}
        focus_day_map[d]["minutes"] += s.actual_duration or 0
        focus_day_map[d]["sessions"] += 1

    deed_day_map: dict = {}
    for dl in deed_logs:
        if dl.status == "Completed":
            d = dl.logged_at.strftime("%Y-%m-%d")
            deed_day_map[d] = deed_day_map.get(d, 0) + 1

    day_stats = []
    for d in days:
        tasks_done = tasks_by_day.get(d, 0)
        habit_entry = habit_day_map.get(d, {})
        habits_completed = len(habit_entry.get("completed", set()))
        prayer_entry = prayer_day_map.get(d, {"on_time": 0, "late": 0, "missed": 0})
        focus_entry = focus_day_map.get(d, {"minutes": 0, "sessions": 0})
        deeds_done = deed_day_map.get(d, 0)

        xp = (
            tasks_done * XP_TASK +
            habits_completed * XP_HABIT +
            prayer_entry["on_time"] * XP_PRAYER_ONTIME +
            prayer_entry["late"] * XP_PRAYER_LATE +
            min(focus_entry["minutes"], 90) * XP_FOCUS_PER_MIN +
            deeds_done * XP_DEED
        )

        day_stats.append({
            "date": d,
            "tasksCompleted": tasks_done,
            "habitsCompleted": habits_completed,
            "habitsTotal": total_habits,
            "prayersOnTime": prayer_entry["on_time"],
            "prayersLate": prayer_entry["late"],
            "prayersMissed": prayer_entry["missed"],
            "focusMinutes": focus_entry["minutes"],
            "focusSessions": focus_entry["sessions"],
            "deedsCompleted": deeds_done,
            "xp": xp,
        })

    total_tasks_completed = sum(d["tasksCompleted"] for d in day_stats)
    total_habits_completed = sum(d["habitsCompleted"] for d in day_stats)
    total_possible_habits = total_habits * len(days)
    avg_habit_rate = round((total_habits_completed / total_possible_habits) * 100) if total_possible_habits > 0 else 0
    total_prayers_on_time = sum(d["prayersOnTime"] for d in day_stats)
    total_prayers_late = sum(d["prayersLate"] for d in day_stats)
    total_prayers_missed = sum(d["prayersMissed"] for d in day_stats)
    total_focus_minutes = sum(d["focusMinutes"] for d in day_stats)
    total_deeds_completed = sum(d["deedsCompleted"] for d in day_stats)
    total_xp = sum(d["xp"] for d in day_stats)

    habit_breakdown = [
        {
            "habitId": h.id,
            "name": h.name,
            "completedDays": habit_completed_days.get(h.id, 0),
            "totalDays": len(days),
        }
        for h in all_habits
    ]

    return JSONResponse(content={
        "period": period,
        "startDate": start_str,
        "endDate": end_str,
        "days": day_stats,
        "totalXp": total_xp,
        "totalTasksCompleted": total_tasks_completed,
        "totalHabitsCompleted": total_habits_completed,
        "avgHabitRate": avg_habit_rate,
        "totalPrayersOnTime": total_prayers_on_time,
        "totalPrayersLate": total_prayers_late,
        "totalPrayersMissed": total_prayers_missed,
        "totalFocusMinutes": total_focus_minutes,
        "totalDeedsCompleted": total_deeds_completed,
        "habitBreakdown": habit_breakdown,
    })
