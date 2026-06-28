from __future__ import annotations

from datetime import datetime, date as date_cls
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Khatmah, IslamicActivity, ActivityLog
from utils import today_str
from clerk_auth import get_current_user_id

router = APIRouter()

_TYPE_TO_CATEGORY = {
    "fard":     "prayer",
    "sunnah":   "sunnah",
    "mostahab": "other",
}

_LOG_STATUS_TO   = {"completed": "Completed", "intended": "Intended"}
_LOG_STATUS_FROM = {"Completed": "completed", "Intended": "intended"}


# ─── Serializers ─────────────────────────────────────────────────────────────
def serialize_khatmah(k: Khatmah) -> dict:
    pages_left = k.total_pages - k.current_page
    percent_complete = round((k.current_page / k.total_pages) * 100) if k.total_pages else 0
    days_to_complete = None
    daily_target = 2
    if k.target_date:
        target = date_cls.fromisoformat(k.target_date)
        days_to_complete = max(0, (target - date_cls.today()).days)
        if days_to_complete > 0:
            daily_target = max(1, -(-pages_left // days_to_complete))
    return {
        "id": k.id,
        "name": k.name,
        "type": k.type,
        "status": k.status,
        "currentSurah": 1,
        "currentPage": k.current_page,
        "totalPages": k.total_pages,
        "targetDate": k.target_date,
        "dailyTarget": daily_target,
        "pagesLeft": pages_left,
        "percentComplete": percent_complete,
        "daysToComplete": days_to_complete,
        "notes": None,
        "updatedAt": k.created_at.isoformat(),
        "createdAt": k.created_at.isoformat(),
    }


def serialize_deed(a: IslamicActivity) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "arabicName": None,
        "rewardText": a.reward_text or "",
        "category": _TYPE_TO_CATEGORY.get(a.type, "other"),
        "hijriMonth": a.hijri_month,
        "hijriDay": a.hijri_day,
        "dayOfWeek": None,
        "isActive": not a.is_archived,
        "sortOrder": 0,
        "type": a.type,
        "createdAt": a.created_at.isoformat(),
    }


def serialize_log(lg: ActivityLog) -> dict:
    return {
        "id": lg.id,
        "activityId": lg.activity_id,
        "status": _LOG_STATUS_FROM.get(lg.status, "completed"),
        "date": lg.logged_at.strftime("%Y-%m-%d"),
        "hijriDate": lg.hijri_date,
        "notes": None,
        "loggedAt": lg.logged_at.isoformat(),
    }


# ─── Request bodies ───────────────────────────────────────────────────────────
class InitQuranBody(BaseModel):
    name: Optional[str] = "My Khatmah"
    targetDate: Optional[str] = None
    currentSurah: Optional[int] = None
    currentPage: Optional[int] = None
    dailyTarget: Optional[int] = None
    notes: Optional[str] = None


class UpdateQuranBody(BaseModel):
    currentSurah: Optional[int] = None
    currentPage: Optional[int] = None
    targetDate: Optional[str] = None
    dailyTarget: Optional[int] = None
    notes: Optional[str] = None


class LogDeedBody(BaseModel):
    status: Optional[str] = "completed"
    date: Optional[str] = None
    hijriDate: Optional[str] = None
    notes: Optional[str] = None


# ─── Khatmah (Quran progress) routes ─────────────────────────────────────────
@router.get("/quran")
def get_quran(
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    k = session.exec(
        select(Khatmah).where(Khatmah.user_id == user_id, Khatmah.is_archived == False).order_by(Khatmah.created_at)
    ).first()
    if not k:
        raise HTTPException(status_code=404, detail="No Khatmah found")
    return JSONResponse(content=serialize_khatmah(k))


@router.post("/quran", status_code=201)
def init_quran(
    body: InitQuranBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    current_page = body.currentPage or 1
    k = Khatmah(
        user_id=user_id,
        name=body.name or "My Khatmah",
        target_date=body.targetDate,
        current_page=current_page,
    )
    session.add(k)
    session.commit()
    session.refresh(k)
    return JSONResponse(content=serialize_khatmah(k), status_code=201)


@router.patch("/quran")
def update_quran(
    body: UpdateQuranBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    k = session.exec(
        select(Khatmah).where(Khatmah.user_id == user_id, Khatmah.is_archived == False)
    ).first()
    if not k:
        raise HTTPException(status_code=404, detail="No Khatmah found. Initialize first.")

    if body.currentPage is not None:
        k.current_page = body.currentPage
    if body.targetDate is not None:
        k.target_date = body.targetDate

    session.add(k)
    session.commit()
    session.refresh(k)
    return JSONResponse(content=serialize_khatmah(k))


# ─── Deeds routes ─────────────────────────────────────────────────────────────
@router.get("/deeds")
def list_deeds(
    todayOnly: Optional[str] = None,
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    deeds = session.exec(
        select(IslamicActivity).where(IslamicActivity.is_archived == False)
    ).all()

    if todayOnly == "true":
        from utils import get_hijri_day
        target_date = date or today_str()
        hijri_day = get_hijri_day(target_date)
        deeds = [d for d in deeds if d.hijri_day is None or d.hijri_day == hijri_day]

    return JSONResponse(content=[serialize_deed(d) for d in deeds])


@router.post("/deeds/{deed_id}/log", status_code=201)
def log_deed(
    deed_id: str,
    body: LogDeedBody,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    stored_status = _LOG_STATUS_TO.get(body.status or "completed", "Completed")
    log_date = body.date or today_str()
    lg = ActivityLog(
        user_id=user_id,
        activity_id=deed_id,
        status=stored_status,
        hijri_date=body.hijriDate,
        logged_at=datetime.fromisoformat(log_date + "T12:00:00"),
    )
    session.add(lg)
    session.commit()
    session.refresh(lg)
    return JSONResponse(content=serialize_log(lg), status_code=201)


@router.get("/deeds/logs")
def get_deed_logs(
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    target_date = date or today_str()
    start = datetime.fromisoformat(target_date + "T00:00:00")
    end = datetime.fromisoformat(target_date + "T23:59:59")
    logs = session.exec(
        select(ActivityLog).where(
            and_(ActivityLog.user_id == user_id, ActivityLog.logged_at >= start, ActivityLog.logged_at <= end)
        )
    ).all()

    activity_ids = list({lg.activity_id for lg in logs})
    activities = {}
    if activity_ids:
        activities = {a.id: a for a in session.exec(
            select(IslamicActivity).where(IslamicActivity.id.in_(activity_ids))
        ).all()}

    result = []
    for lg in logs:
        d = serialize_log(lg)
        act = activities.get(lg.activity_id)
        if act:
            d["activityName"] = act.name
            d["activityCategory"] = _TYPE_TO_CATEGORY.get(act.type, "other")
            d["activityRewardText"] = act.reward_text or ""
        result.append(d)

    return JSONResponse(content=result)
