from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import FocusSession
from utils import camelify, today_str

router = APIRouter()


def serialize_session(s: FocusSession) -> dict:
    return camelify(s.model_dump())


@router.get("/focus/stats")
def get_focus_stats(session: Session = Depends(get_session)):
    now = datetime.utcnow()
    today_str_val = now.strftime("%Y-%m-%d")
    week_ago = now - timedelta(days=6)
    week_start = week_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    all_sessions = session.exec(
        select(FocusSession).where(FocusSession.started_at >= week_start)
    ).all()

    today_sessions = [s for s in all_sessions if s.started_at.strftime("%Y-%m-%d") == today_str_val]
    today_minutes = sum(s.duration_minutes for s in today_sessions)
    week_minutes = sum(s.duration_minutes for s in all_sessions)

    daily_map = {}
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_map[d] = {"minutes": 0, "sessions": 0}

    for s in all_sessions:
        key = s.started_at.strftime("%Y-%m-%d")
        if key in daily_map:
            daily_map[key]["minutes"] += s.duration_minutes
            daily_map[key]["sessions"] += 1

    daily_breakdown = [{"date": d, **v} for d, v in daily_map.items()]

    return JSONResponse(content=camelify({
        "today_minutes": today_minutes,
        "week_minutes": week_minutes,
        "today_sessions": len(today_sessions),
        "week_sessions": len(all_sessions),
        "daily_breakdown": [camelify({"date": d["date"], "minutes": d["minutes"], "sessions": d["sessions"]}) for d in daily_breakdown],
    }))


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

    return JSONResponse(content=[serialize_session(s) for s in sessions])


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
    started_at = datetime.fromisoformat(body.startedAt.replace("Z", "+00:00")) if "Z" in body.startedAt else datetime.fromisoformat(body.startedAt)
    ended_at = None
    if body.endedAt:
        ended_at = datetime.fromisoformat(body.endedAt.replace("Z", "+00:00")) if "Z" in body.endedAt else datetime.fromisoformat(body.endedAt)

    fs = FocusSession(
        task_id=body.taskId,
        task_title=body.taskTitle,
        duration_minutes=body.durationMinutes,
        status=body.status,
        started_at=started_at,
        ended_at=ended_at,
        notes=body.notes,
    )
    session.add(fs)
    session.commit()
    session.refresh(fs)
    return JSONResponse(content=serialize_session(fs), status_code=201)


@router.patch("/focus/{session_id}")
def update_focus_session(session_id: str, body: UpdateFocusBody, session: Session = Depends(get_session)):
    fs = session.get(FocusSession, session_id)
    if not fs:
        raise HTTPException(status_code=404, detail="Focus session not found")

    if body.durationMinutes is not None:
        fs.duration_minutes = body.durationMinutes
    if body.status is not None:
        fs.status = body.status
    if body.endedAt is not None:
        fs.ended_at = datetime.fromisoformat(body.endedAt.replace("Z", "+00:00")) if "Z" in body.endedAt else datetime.fromisoformat(body.endedAt)
    if body.notes is not None:
        fs.notes = body.notes

    session.add(fs)
    session.commit()
    session.refresh(fs)
    return JSONResponse(content=serialize_session(fs))


@router.delete("/focus/{session_id}", status_code=204)
def delete_focus_session(session_id: str, session: Session = Depends(get_session)):
    fs = session.get(FocusSession, session_id)
    if not fs:
        raise HTTPException(status_code=404, detail="Focus session not found")
    session.delete(fs)
    session.commit()
