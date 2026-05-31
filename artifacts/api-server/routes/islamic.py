from __future__ import annotations

from datetime import datetime, date as date_cls
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import QuranProgress, IslamicActivity, ActivityLog
from utils import camelify, today_str

router = APIRouter()


def serialize_quran(p: QuranProgress) -> dict:
    d = camelify(p.model_dump())
    pages_left = p.total_pages - p.current_page
    percent_complete = round((p.current_page / p.total_pages) * 100)
    days_to_complete = None
    if p.target_date:
        target = date_cls.fromisoformat(p.target_date)
        days_to_complete = max(0, (target - date_cls.today()).days)
    d["pagesLeft"] = pages_left
    d["percentComplete"] = percent_complete
    d["daysToComplete"] = days_to_complete
    return d


def serialize_deed(a: IslamicActivity) -> dict:
    return camelify(a.model_dump())


def serialize_log(l: ActivityLog) -> dict:
    return camelify(l.model_dump())


class InitQuranBody(BaseModel):
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


@router.get("/quran")
def get_quran(session: Session = Depends(get_session)):
    progress = session.exec(select(QuranProgress).order_by(QuranProgress.created_at)).first()
    if not progress:
        raise HTTPException(status_code=404, detail="No Quran progress found")
    return JSONResponse(content=serialize_quran(progress))


@router.post("/quran", status_code=201)
def init_quran(body: InitQuranBody, session: Session = Depends(get_session)):
    current_page = body.currentPage or 1
    daily_target = body.dailyTarget or 2
    if body.targetDate and not body.dailyTarget:
        target = date_cls.fromisoformat(body.targetDate)
        days_left = max(1, (target - date_cls.today()).days)
        pages_left = 604 - current_page
        daily_target = max(1, -(-pages_left // days_left))

    progress = QuranProgress(
        target_date=body.targetDate,
        current_surah=body.currentSurah or 1,
        current_page=current_page,
        daily_target=daily_target,
        notes=body.notes,
    )
    session.add(progress)
    session.commit()
    session.refresh(progress)
    return JSONResponse(content=serialize_quran(progress), status_code=201)


@router.patch("/quran")
def update_quran(body: UpdateQuranBody, session: Session = Depends(get_session)):
    progress = session.exec(select(QuranProgress)).first()
    if not progress:
        raise HTTPException(status_code=404, detail="No Quran progress found. Initialize first.")

    if body.currentPage is not None:
        progress.current_page = body.currentPage
    if body.currentSurah is not None:
        progress.current_surah = body.currentSurah
    if body.targetDate is not None:
        progress.target_date = body.targetDate
    if body.dailyTarget is not None:
        progress.daily_target = body.dailyTarget
    if body.notes is not None:
        progress.notes = body.notes

    if body.targetDate and not body.dailyTarget:
        target = date_cls.fromisoformat(body.targetDate)
        days_left = max(1, (target - date_cls.today()).days)
        current_page = body.currentPage if body.currentPage is not None else progress.current_page
        pages_left = 604 - current_page
        progress.daily_target = max(1, -(-pages_left // days_left))

    progress.updated_at = datetime.utcnow()
    session.add(progress)
    session.commit()
    session.refresh(progress)
    return JSONResponse(content=serialize_quran(progress))


@router.get("/deeds")
def list_deeds(
    todayOnly: Optional[str] = None,
    date: Optional[str] = None,
    session: Session = Depends(get_session),
):
    target_date = date or today_str()
    day_of_week = date_cls.fromisoformat(target_date).weekday()
    python_to_js_day = (day_of_week + 1) % 7

    deeds = session.exec(
        select(IslamicActivity).where(IslamicActivity.is_active == True)
    ).all()

    if todayOnly == "true":
        deeds = [d for d in deeds if d.day_of_week is None or d.day_of_week == python_to_js_day]

    deeds = sorted(deeds, key=lambda d: d.sort_order)
    return JSONResponse(content=[serialize_deed(d) for d in deeds])


@router.post("/deeds/{deed_id}/log", status_code=201)
def log_deed(deed_id: str, body: LogDeedBody, session: Session = Depends(get_session)):
    log_date = body.date or today_str()
    log = ActivityLog(
        activity_id=deed_id,
        status=body.status or "completed",
        date=log_date,
        hijri_date=body.hijriDate,
        notes=body.notes,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return JSONResponse(content=serialize_log(log), status_code=201)


@router.get("/deeds/logs")
def get_deed_logs(date: Optional[str] = None, session: Session = Depends(get_session)):
    target_date = date or today_str()
    logs = session.exec(select(ActivityLog).where(ActivityLog.date == target_date)).all()
    activity_ids = list({l.activity_id for l in logs})
    activities = {a.id: a for a in session.exec(
        select(IslamicActivity).where(IslamicActivity.id.in_(activity_ids))
    ).all()} if activity_ids else {}

    result = []
    for l in logs:
        d = serialize_log(l)
        act = activities.get(l.activity_id)
        if act:
            d["activityName"] = act.name
            d["activityCategory"] = act.category
            d["activityRewardText"] = act.reward_text
        result.append(d)

    return JSONResponse(content=result)
