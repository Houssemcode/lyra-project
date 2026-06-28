from __future__ import annotations

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import CalendarEvent
from clerk_auth import get_current_user_id

router = APIRouter()

_TYPE_FROM = {
    "Native": "native",
    "Task_Import": "task",
    "Prayer_Import": "prayer",
}


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if "Z" in s else datetime.fromisoformat(s)


def serialize_event(e: CalendarEvent) -> dict:
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "location": e.location,
        "startTime": e.start_time.isoformat(),
        "endTime": e.end_time.isoformat() if e.end_time else None,
        "allDay": e.is_all_day,
        "category": None,
        "source": _TYPE_FROM.get(e.event_type, "native"),
        "createdAt": e.created_at.isoformat(),
    }


class CreateEventBody(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    startTime: str
    endTime: Optional[str] = None
    allDay: Optional[bool] = False
    category: Optional[str] = None


class UpdateEventBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    allDay: Optional[bool] = None
    category: Optional[str] = None


@router.get("/events")
def list_events(
    start: Optional[str] = None,
    end: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    conditions = [CalendarEvent.user_id == user_id, CalendarEvent.is_archived == False]
    if start:
        conditions.append(CalendarEvent.start_time >= _parse_dt(start))
    if end:
        end_dt = datetime.fromisoformat((end + "T23:59:59").replace("Z", ""))
        conditions.append(CalendarEvent.start_time <= end_dt)

    events = session.exec(select(CalendarEvent).where(and_(*conditions))).all()
    return JSONResponse(content=[serialize_event(e) for e in events])


@router.post("/events", status_code=201)
def create_event(
    body: CreateEventBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    event = CalendarEvent(
        user_id=user_id,
        title=body.title,
        description=body.description,
        location=body.location,
        start_time=_parse_dt(body.startTime),
        end_time=_parse_dt(body.endTime) if body.endTime else None,
        is_all_day=body.allDay or False,
        event_type="Native",
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return JSONResponse(content=serialize_event(event), status_code=201)


@router.patch("/events/{event_id}")
def update_event(
    event_id: str,
    body: UpdateEventBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    event = session.get(CalendarEvent, event_id)
    if not event or event.user_id != user_id:
        raise HTTPException(status_code=404, detail="Event not found")

    if body.title is not None:
        event.title = body.title
    if body.description is not None:
        event.description = body.description
    if body.location is not None:
        event.location = body.location
    if body.startTime is not None:
        event.start_time = _parse_dt(body.startTime)
    if body.endTime is not None:
        event.end_time = _parse_dt(body.endTime)
    if body.allDay is not None:
        event.is_all_day = body.allDay

    session.add(event)
    session.commit()
    session.refresh(event)
    return JSONResponse(content=serialize_event(event))


@router.delete("/events/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    event = session.get(CalendarEvent, event_id)
    if not event or event.user_id != user_id:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(event)
    session.commit()
