from __future__ import annotations

from datetime import datetime, date as date_cls, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Habit, HabitLog, Routine, Folder
from utils import today_str
from clerk_auth import get_current_user_id

router = APIRouter()

# ─── HabitLog status mapping ──────────────────────────────────────────────────
_LOG_TO   = {"completed": "Completed", "skipped": "Skipped", "missed": "Failed"}
_LOG_FROM = {"Completed": "completed", "Skipped": "skipped", "Failed": "missed"}

# ─── Habit type mapping ───────────────────────────────────────────────────────
_TYPE_TO: dict = {"positive": "Binary", "negative": "Binary"}


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _get_routine_by_name(session: Session, name: str) -> Optional[Routine]:
    canonical = name.strip().capitalize()
    return session.exec(
        select(Routine).where(Routine.name == canonical, Routine.is_archived == False)
    ).first()


def _get_or_create_folder(session: Session, name: Optional[str]) -> Optional[Folder]:
    if not name:
        return None
    obj = session.exec(
        select(Folder).where(Folder.name == name, Folder.is_archived == False)
    ).first()
    if not obj:
        obj = Folder(name=name)
        session.add(obj)
        session.commit()
        session.refresh(obj)
    return obj


def serialize_habit(h: Habit, session: Session) -> dict:
    time_of_day = "anytime"
    if h.routine_id:
        routine = session.get(Routine, h.routine_id)
        if routine:
            time_of_day = routine.name.lower()

    category = None
    if h.folder_id:
        folder = session.get(Folder, h.folder_id)
        if folder:
            category = folder.name

    return {
        "id": h.id,
        "name": h.name,
        "category": category,
        "timeOfDay": time_of_day,
        "type": h.type,
        "streak": h.current_streak,
        "bestStreak": h.longest_streak,
        "isArchived": h.is_archived,
        "createdAt": h.created_at.isoformat(),
    }


def serialize_log(lg: HabitLog) -> dict:
    return {
        "id": lg.id,
        "habitId": lg.habit_id,
        "date": lg.date,
        "status": _LOG_FROM.get(lg.status, lg.status.lower()),
        "loggedAt": lg.logged_at.isoformat(),
    }


def _recalc_streaks(session: Session, habit_id: str, today: str) -> tuple[int, int]:
    completed = session.exec(
        select(HabitLog).where(
            and_(HabitLog.habit_id == habit_id, HabitLog.status == "Completed")
        ).order_by(HabitLog.date.desc())
    ).all()

    today_d = date_cls.fromisoformat(today)
    streak = 0
    for i, cl in enumerate(completed):
        expected = today_d - timedelta(days=i)
        if cl.date == expected.isoformat():
            streak += 1
        else:
            break

    sorted_asc = list(reversed(completed))
    best = streak if streak > 0 else (1 if sorted_asc else 0)
    run = 1 if sorted_asc else 0
    for i in range(1, len(sorted_asc)):
        prev = date_cls.fromisoformat(sorted_asc[i - 1].date)
        curr = date_cls.fromisoformat(sorted_asc[i].date)
        if (curr - prev).days == 1:
            run += 1
            best = max(best, run)
        else:
            run = 1

    return streak, best


# ─── Request bodies ───────────────────────────────────────────────────────────
class CreateHabitBody(BaseModel):
    name: str
    category: Optional[str] = None
    timeOfDay: Optional[str] = "anytime"
    type: Optional[str] = "Binary"


class UpdateHabitBody(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    timeOfDay: Optional[str] = None
    isArchived: Optional[bool] = None


class LogHabitBody(BaseModel):
    status: str
    date: Optional[str] = None


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.get("/habits/today")
def get_today_habits(
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    today = today_str()
    habits = session.exec(select(Habit).where(Habit.user_id == user_id, Habit.is_archived == False)).all()
    habit_ids = [h.id for h in habits]
    logs = session.exec(
        select(HabitLog).where(HabitLog.habit_id.in_(habit_ids), HabitLog.date == today)
    ).all() if habit_ids else []
    log_map = {lg.habit_id: _LOG_FROM.get(lg.status, lg.status.lower()) for lg in logs}
    result = []
    for h in habits:
        d = serialize_habit(h, session)
        d["todayStatus"] = log_map.get(h.id)
        result.append(d)
    return JSONResponse(content=result)


@router.get("/habits")
def list_habits(
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    habits = session.exec(select(Habit).where(Habit.user_id == user_id)).all()
    return JSONResponse(content=[serialize_habit(h, session) for h in habits])


@router.post("/habits", status_code=201)
def create_habit(
    body: CreateHabitBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    time_of_day = body.timeOfDay or "anytime"
    routine = _get_routine_by_name(session, time_of_day)
    folder = _get_or_create_folder(session, body.category)
    habit_type = _TYPE_TO.get(body.type or "Binary", body.type or "Binary")

    habit = Habit(
        user_id=user_id,
        name=body.name,
        routine_id=routine.id if routine else None,
        folder_id=folder.id if folder else None,
        type=habit_type,
    )
    session.add(habit)
    session.commit()
    session.refresh(habit)
    return JSONResponse(content=serialize_habit(habit, session), status_code=201)


@router.patch("/habits/{habit_id}")
def update_habit(
    habit_id: str,
    body: UpdateHabitBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    habit = session.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=404, detail="Habit not found")

    if body.name is not None:
        habit.name = body.name
    if body.category is not None:
        folder = _get_or_create_folder(session, body.category)
        habit.folder_id = folder.id if folder else None
    if body.timeOfDay is not None:
        routine = _get_routine_by_name(session, body.timeOfDay)
        habit.routine_id = routine.id if routine else None
    if body.isArchived is not None:
        habit.is_archived = body.isArchived
        if body.isArchived:
            habit.archived_at = datetime.utcnow()

    session.add(habit)
    session.commit()
    session.refresh(habit)
    return JSONResponse(content=serialize_habit(habit, session))


@router.delete("/habits/{habit_id}", status_code=204)
def delete_habit(
    habit_id: str,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    habit = session.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=404, detail="Habit not found")
    session.delete(habit)
    session.commit()


@router.post("/habits/{habit_id}/log")
def log_habit(
    habit_id: str,
    body: LogHabitBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    habit = session.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=404, detail="Habit not found")

    log_date = body.date or today_str()
    stored_status = _LOG_TO.get(body.status, body.status)

    existing = session.exec(
        select(HabitLog).where(
            and_(HabitLog.habit_id == habit_id, HabitLog.date == log_date)
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()

    lg = HabitLog(habit_id=habit_id, date=log_date, status=stored_status)
    session.add(lg)
    session.commit()
    session.refresh(lg)

    streak, best = _recalc_streaks(session, habit_id, today_str())
    if habit:
        habit.current_streak = streak
        habit.longest_streak = max(habit.longest_streak, best)
        session.add(habit)
        session.commit()

    return JSONResponse(content=serialize_log(lg))
