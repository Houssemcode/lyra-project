from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import FocusSession, Task
from utils import today_str

router = APIRouter()

_STATUS_TO   = {"completed": "Completed", "interrupted": "Interrupted"}
_STATUS_FROM = {"Completed": "completed", "Interrupted": "interrupted"}


def serialize_session(fs: FocusSession, session: Session) -> dict:
    task_title: Optional[str] = None
    if fs.task_id:
        t = session.get(Task, fs.task_id)
        task_title = t.title if t else None

    return {
        "id": fs.id,
        "taskId": fs.task_id,
        "taskTitle": task_title,
        "durationMinutes": fs.actual_duration or 0,
        "status": _STATUS_FROM.get(fs.status, fs.status.lower()),
        "startedAt": fs.started_at.isoformat(),
        "endedAt": fs.ended_at.isoformat() if fs.ended_at else None,
        "notes": None,
    }


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if "Z" in s else datetime.fromisoformat(s)


@router.get("/focus/stats")
def get_focus_stats(session: Session = Depends(get_session)):
    now = datetime.utcnow()
    today_str_val = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)

    all_sessions = session.exec(
        select(FocusSession).where(FocusSession.started_at >= week_start)
    ).all()

    today_sessions = [s for s in all_sessions if s.started_at.strftime("%Y-%m-%d") == today_str_val]
    today_minutes = sum(s.actual_duration or 0 for s in today_sessions)
    week_minutes = sum(s.actual_duration or 0 for s in all_sessions)

    daily_map: dict = {}
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_map[d] = {"minutes": 0, "sessions": 0}

    for s in all_sessions:
        key = s.started_at.strftime("%Y-%m-%d")
        if key in daily_map:
            daily_map[key]["minutes"] += s.actual_duration or 0
            daily_map[key]["sessions"] += 1

    daily_breakdown = [
        {"date": d, "minutes": v["minutes"], "sessions": v["sessions"]}
        for d, v in daily_map.items()
    ]

    return JSONResponse(content={
        "todayMinutes": today_minutes,
        "weekMinutes": week_minutes,
        "todaySessions": len(today_sessions),
        "weekSessions": len(all_sessions),
        "dailyBreakdown": daily_breakdown,
    })


@router.get("/focus")
def list_focus_sessions(date: Optional[str] = None, session: Session = Depends(get_session)):
    if date:
        start = datetime.fromisoformat(date + "T00:00:00")
        end = datetime.fromisoformat(date + "T23:59:59")
        sessions = session.exec(
            select(FocusSession).where(
                and_(FocusSession.started_at >= start, FocusSession.started_at <= end)
            )
        ).all()
    else:
        sessions = session.exec(select(FocusSession)).all()

    return JSONResponse(content=[serialize_session(s, session) for s in sessions])


class CreateFocusBody(BaseModel):
    taskId: Optional[str] = None
    taskTitle: Optional[str] = None
    durationMinutes: int
    status: str
    startedAt: str
    endedAt: Optional[str] = None
    notes: Optional[str] = None


class UpdateFocusBody(BaseModel):
    durationMinutes: Optional[int] = None
    status: Optional[str] = None
    endedAt: Optional[str] = None
    notes: Optional[str] = None


@router.post("/focus", status_code=201)
def create_focus_session(body: CreateFocusBody, session: Session = Depends(get_session)):
    started_at = _parse_dt(body.startedAt)
    ended_at = _parse_dt(body.endedAt) if body.endedAt else None
    stored_status = _STATUS_TO.get(body.status, "Completed")

    fs = FocusSession(
        task_id=body.taskId,
        actual_duration=body.durationMinutes,
        planned_duration=body.durationMinutes,
        status=stored_status,
        started_at=started_at,
        ended_at=ended_at,
    )
    session.add(fs)
    session.commit()
    session.refresh(fs)
    return JSONResponse(content=serialize_session(fs, session), status_code=201)


@router.patch("/focus/{session_id}")
def update_focus_session(session_id: str, body: UpdateFocusBody, session: Session = Depends(get_session)):
    fs = session.get(FocusSession, session_id)
    if not fs:
        raise HTTPException(status_code=404, detail="Focus session not found")

    if body.durationMinutes is not None:
        fs.actual_duration = body.durationMinutes
    if body.status is not None:
        fs.status = _STATUS_TO.get(body.status, body.status)
    if body.endedAt is not None:
        fs.ended_at = _parse_dt(body.endedAt)

    session.add(fs)
    session.commit()
    session.refresh(fs)
    return JSONResponse(content=serialize_session(fs, session))


@router.delete("/focus/{session_id}", status_code=204)
def delete_focus_session(session_id: str, session: Session = Depends(get_session)):
    fs = session.get(FocusSession, session_id)
    if not fs:
        raise HTTPException(status_code=404, detail="Focus session not found")
    session.delete(fs)
    session.commit()
