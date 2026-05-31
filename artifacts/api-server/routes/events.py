from __future__ import annotations

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Event
from utils import camelify

router = APIRouter()


def serialize_event(e: Event) -> dict:
    return camelify(e.model_dump())


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
    session: Session = Depends(get_session),
):
    conditions = []
    if start:
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00")) if "Z" in start or "+" in start else datetime.fromisoformat(start)
        conditions.append(Event.start_time >= start_dt)
    if end:
        end_dt = datetime.fromisoformat((end + "T23:59:59").replace("Z", ""))
        conditions.append(Event.start_time <= end_dt)

    query = select(Event)
    if conditions:
        query = query.where(and_(*conditions))

    events = session.exec(query).all()
    return JSONResponse(content=[serialize_event(e) for e in events])


@router.post("/events", status_code=201)
def create_event(body: CreateEventBody, session: Session = Depends(get_session)):
    start_time = datetime.fromisoformat(body.startTime.replace("Z", "+00:00")) if "Z" in body.startTime else datetime.fromisoformat(body.startTime)
    end_time = None
    if body.endTime:
        end_time = datetime.fromisoformat(body.endTime.replace("Z", "+00:00")) if "Z" in body.endTime else datetime.fromisoformat(body.endTime)

    event = Event(
        title=body.title,
        description=body.description,
        location=body.location,
        start_time=start_time,
        end_time=end_time,
        all_day=body.allDay or False,
        category=body.category,
        source="native",
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return JSONResponse(content=serialize_event(event), status_code=201)


@router.patch("/events/{event_id}")
def update_event(event_id: str, body: UpdateEventBody, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if body.title is not None:
        event.title = body.title
    if body.description is not None:
        event.description = body.description
    if body.location is not None:
        event.location = body.location
    if body.startTime is not None:
        event.start_time = datetime.fromisoformat(body.startTime.replace("Z", "+00:00")) if "Z" in body.startTime else datetime.fromisoformat(body.startTime)
    if body.endTime is not None:
        event.end_time = datetime.fromisoformat(body.endTime.replace("Z", "+00:00")) if "Z" in body.endTime else datetime.fromisoformat(body.endTime)
    if body.allDay is not None:
        event.all_day = body.allDay
    if body.category is not None:
        event.category = body.category

    session.add(event)
    session.commit()
    session.refresh(event)
    return JSONResponse(content=serialize_event(event))


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: str, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(event)
    session.commit()
