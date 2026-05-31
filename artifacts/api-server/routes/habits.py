from __future__ import annotations

from datetime import datetime, date as date_cls, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Habit, HabitLog
from utils import camelify, today_str

router = APIRouter()


def serialize_habit(h: Habit) -> dict:
    return camelify(h.model_dump())


@router.get("/habits/today")
def get_today_habits(session: Session = Depends(get_session)):
    today = today_str()
    habits = session.exec(select(Habit).where(Habit.is_archived == False)).all()
    logs = session.exec(select(HabitLog).where(HabitLog.date == today)).all()
    log_map = {l.habit_id: l.status for l in logs}
    result = []
    for h in habits:
        d = serialize_habit(h)
        d["todayStatus"] = log_map.get(h.id)
        result.append(d)
    return JSONResponse(content=result)


@router.get("/habits")
def list_habits(session: Session = Depends(get_session)):
    habits = session.exec(select(Habit)).all()
    return JSONResponse(content=[serialize_habit(h) for h in habits])


class CreateHabitBody(BaseModel):
    name: str
    category: Optional[str] = None
    timeOfDay: Optional[str] = "anytime"
    type: Optional[str] = "positive"


class UpdateHabitBody(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    timeOfDay: Optional[str] = None
    isArchived: Optional[bool] = None


@router.post("/habits", status_code=201)
def create_habit(body: CreateHabitBody, session: Session = Depends(get_session)):
    habit = Habit(
        name=body.name,
        category=body.category,
        time_of_day=body.timeOfDay or "anytime",
        type=body.type or "positive",
    )
    session.add(habit)
    session.commit()
    session.refresh(habit)
    return JSONResponse(content=serialize_habit(habit), status_code=201)


@router.patch("/habits/{habit_id}")
def update_habit(habit_id: str, body: UpdateHabitBody, session: Session = Depends(get_session)):
    habit = session.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    if body.name is not None:
        habit.name = body.name
    if body.category is not None:
        habit.category = body.category
    if body.timeOfDay is not None:
        habit.time_of_day = body.timeOfDay
    if body.isArchived is not None:
        habit.is_archived = body.isArchived

    session.add(habit)
    session.commit()
    session.refresh(habit)
    return JSONResponse(content=serialize_habit(habit))


@router.delete("/habits/{habit_id}", status_code=204)
def delete_habit(habit_id: str, session: Session = Depends(get_session)):
    habit = session.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    session.delete(habit)
    session.commit()


class LogHabitBody(BaseModel):
    status: str
    date: Optional[str] = None


@router.post("/habits/{habit_id}/log")
def log_habit(habit_id: str, body: LogHabitBody, session: Session = Depends(get_session)):
    log_date = body.date or today_str()

    existing = session.exec(
        select(HabitLog).where(
            and_(HabitLog.habit_id == habit_id, HabitLog.date == log_date)
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()

    log = HabitLog(habit_id=habit_id, date=log_date, status=body.status)
    session.add(log)
    session.commit()
    session.refresh(log)

    completed_logs = session.exec(
        select(HabitLog).where(
            and_(HabitLog.habit_id == habit_id, HabitLog.status == "completed")
        ).order_by(HabitLog.date.desc())
    ).all()

    today = date_cls.fromisoformat(today_str())
    streak = 0
    for i, cl in enumerate(completed_logs):
        expected = today - timedelta(days=i)
        if cl.date == expected.isoformat():
            streak += 1
        else:
            break

    sorted_asc = list(reversed(completed_logs))
    best_run = streak if streak > 0 else (1 if sorted_asc else 0)
    run = 1 if sorted_asc else 0
    for i in range(1, len(sorted_asc)):
        prev = date_cls.fromisoformat(sorted_asc[i - 1].date)
        curr = date_cls.fromisoformat(sorted_asc[i].date)
        if (curr - prev).days == 1:
            run += 1
            if run > best_run:
                best_run = run
        else:
            run = 1

    habit = session.get(Habit, habit_id)
    if habit:
        new_best = max(habit.best_streak, best_run)
        habit.streak = streak
        habit.best_streak = new_best
        session.add(habit)
        session.commit()

    return JSONResponse(content=camelify(log.model_dump()))
