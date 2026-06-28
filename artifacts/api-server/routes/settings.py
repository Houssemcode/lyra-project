from __future__ import annotations

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from database import get_session
from models import UserSettings
from utils import camelify

router = APIRouter()


def serialize_settings(s: UserSettings) -> dict:
    d = s.model_dump()
    return camelify({k: str(v) if hasattr(v, "hex") else v for k, v in d.items()})


def get_or_create_settings(session: Session) -> UserSettings:
    settings = session.exec(select(UserSettings)).first()
    if not settings:
        settings = UserSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@router.get("/settings")
def get_settings(session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    return JSONResponse(content=serialize_settings(settings))


class UpdateSettingsBody(BaseModel):
    displayName: Optional[str] = None
    prayerMethod: Optional[str] = None
    prayerMadhab: Optional[str] = None
    timeFormat: Optional[str] = None


@router.patch("/settings")
def update_settings(body: UpdateSettingsBody, session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)

    if body.displayName is not None:
        settings.display_name = body.displayName
    if body.prayerMethod is not None:
        settings.prayer_method = body.prayerMethod
    if body.prayerMadhab is not None:
        settings.prayer_madhab = body.prayerMadhab
    if body.timeFormat is not None:
        settings.time_format = body.timeFormat

    settings.updated_at = datetime.utcnow()
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return JSONResponse(content=serialize_settings(settings))
