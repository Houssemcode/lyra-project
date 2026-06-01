from __future__ import annotations

import math
from datetime import datetime, date as date_cls
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from database import get_session
from models import PrayerLog, UserSettings
from utils import today_str

router = APIRouter()

PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

# stored:   On_Time / Late / Missed / None(pending)
# frontend: on_time / late / missed / pending
_STATUS_TO   = {"pending": None, "on_time": "On_Time", "late": "Late", "missed": "Missed"}
_STATUS_FROM = {None: "pending", "On_Time": "on_time", "Late": "late", "Missed": "missed"}

METHOD_PARAMS = {
    "MuslimWorldLeague":      (18.0, 17.0, False),
    "NorthAmerica":           (15.0, 15.0, False),
    "Egyptian":               (19.5, 17.5, False),
    "Karachi":                (18.0, 18.0, False),
    "UmmAlQura":              (18.5, None, True),
    "Gulf":                   (19.5, None, True),
    "MoonsightingCommittee":  (18.0, 18.0, False),
    "Kuwait":                 (18.0, 17.5, False),
    "Qatar":                  (18.0, None, True),
    "Singapore":              (20.0, 18.0, False),
    "Tehran":                 (17.7, 14.0, False),
    "Turkey":                 (18.0, 17.0, False),
}


def _julian_day(year: int, month: int, day: int) -> float:
    if month <= 2:
        year -= 1
        month += 12
    A = math.floor(year / 100)
    B = 2 - A + math.floor(A / 4)
    return math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + B - 1524.5


def _sun_position(jd: float):
    D = jd - 2451545.0
    g = math.radians(357.529 + 0.98560028 * D)
    q = math.radians(280.459 + 0.98564736 * D)
    L = q + math.radians(1.9915 * math.sin(g) + 0.0200 * math.sin(2 * g))
    e = math.radians(23.439 - 0.0000004 * D)
    RA = math.atan2(math.cos(e) * math.sin(L), math.cos(L)) * 12 / math.pi
    dec = math.degrees(math.asin(math.sin(e) * math.sin(L)))
    EqT = (q * 12 / math.pi) - (RA % 24)
    return dec, EqT


def _hour_angle(lat: float, dec: float, angle: float) -> Optional[float]:
    lat_r = math.radians(lat)
    dec_r = math.radians(dec)
    cos_t = (math.cos(math.radians(angle)) - math.sin(lat_r) * math.sin(dec_r)) / (math.cos(lat_r) * math.cos(dec_r))
    if abs(cos_t) > 1:
        return None
    return math.degrees(math.acos(cos_t)) / 15.0


def _asr_angle(lat: float, dec: float, shadow: int) -> Optional[float]:
    lat_r = math.radians(lat)
    dec_r = math.radians(dec)
    angle = math.atan(1.0 / (shadow + math.tan(abs(lat_r - dec_r))))
    cos_t = (math.sin(angle) - math.sin(lat_r) * math.sin(dec_r)) / (math.cos(lat_r) * math.cos(dec_r))
    if abs(cos_t) > 1:
        return None
    return math.degrees(math.acos(cos_t)) / 15.0


def _fmt(h: float) -> str:
    h = h % 24
    hh = int(h)
    mm = round((h - hh) * 60)
    if mm >= 60:
        hh += 1
        mm -= 60
    return f"{hh:02d}:{mm:02d}"


def calculate_prayer_times(lat: float, lng: float, target_date: str, method: str = "MoonsightingCommittee", madhab: str = "Shafi") -> Optional[dict]:
    d = date_cls.fromisoformat(target_date)
    jd = _julian_day(d.year, d.month, d.day)
    dec, eq_t = _sun_position(jd)
    utc_offset = lng / 15.0
    transit = 12.0 - (lng / 15.0) - eq_t
    fajr_angle, isha_angle, isha_is_fixed = METHOD_PARAMS.get(method, (18.0, 18.0, False))
    shadow_factor = 2 if madhab == "Hanafi" else 1

    sunrise_ha = _hour_angle(lat, dec, 0.833)
    if sunrise_ha is None:
        return None
    sunrise = transit - sunrise_ha
    sunset = transit + sunrise_ha

    fajr_ha = _hour_angle(lat, dec, fajr_angle)
    fajr = transit - (fajr_ha if fajr_ha else sunrise_ha)
    dhuhr = transit + (1.0 / 60.0)
    asr_ha = _asr_angle(lat, dec, shadow_factor)
    asr = transit + (asr_ha if asr_ha else 3.0)
    maghrib = sunset + (2.0 / 60.0)
    if isha_is_fixed:
        isha = maghrib + 1.5
    else:
        isha_ha = _hour_angle(lat, dec, isha_angle)
        isha = transit + (isha_ha if isha_ha else sunrise_ha)

    def to_local(h: float) -> str:
        return _fmt(h + utc_offset)

    return {
        "Fajr":    to_local(fajr),
        "Dhuhr":   to_local(dhuhr),
        "Asr":     to_local(asr),
        "Maghrib": to_local(maghrib),
        "Isha":    to_local(isha),
    }


def serialize_prayer(p: PrayerLog) -> dict:
    return {
        "id": p.id,
        "name": p.prayer_name,
        "date": p.date,
        "scheduledTime": p.calculated_time,
        "status": _STATUS_FROM.get(p.status, "pending"),
        "completedAt": p.logged_at.isoformat() if p.logged_at else None,
    }


class CalculateBody(BaseModel):
    latitude: float
    longitude: float
    date: Optional[str] = None
    method: Optional[str] = None


class SeedBody(BaseModel):
    date: str
    times: Optional[dict] = None


class UpdatePrayerBody(BaseModel):
    status: str
    scheduledTime: Optional[str] = None
    completedAt: Optional[str] = None


@router.post("/prayers/calculate")
def calculate_prayers(body: CalculateBody, session: Session = Depends(get_session)):
    target_date = body.date or today_str()
    settings = session.exec(select(UserSettings)).first()
    method = body.method or (settings.prayer_method if settings else "MoonsightingCommittee")
    madhab = settings.prayer_madhab if settings else "Shafi"

    times = calculate_prayer_times(body.latitude, body.longitude, target_date, method, madhab)
    if not times:
        raise HTTPException(status_code=500, detail="Prayer time calculation failed")

    existing = session.exec(select(PrayerLog).where(PrayerLog.date == target_date)).all()
    if existing:
        for p in existing:
            p.calculated_time = times.get(p.prayer_name)
            session.add(p)
        session.commit()
        prayers = session.exec(select(PrayerLog).where(PrayerLog.date == target_date)).all()
        prayers = sorted(prayers, key=lambda p: PRAYER_ORDER.index(p.prayer_name))
        return JSONResponse(content=[serialize_prayer(p) for p in prayers])

    entries = []
    for name in PRAYER_ORDER:
        p = PrayerLog(prayer_name=name, date=target_date, calculated_time=times.get(name))
        session.add(p)
        entries.append(p)
    session.commit()
    for p in entries:
        session.refresh(p)
    return JSONResponse(content=[serialize_prayer(p) for p in entries])


@router.post("/prayers/seed")
def seed_prayers(body: SeedBody, session: Session = Depends(get_session)):
    existing = session.exec(select(PrayerLog).where(PrayerLog.date == body.date)).all()
    if existing:
        return JSONResponse(content=[serialize_prayer(p) for p in sorted(existing, key=lambda p: PRAYER_ORDER.index(p.prayer_name))])

    entries = []
    for name in PRAYER_ORDER:
        p = PrayerLog(
            prayer_name=name,
            date=body.date,
            calculated_time=(body.times or {}).get(name),
        )
        session.add(p)
        entries.append(p)
    session.commit()
    for p in entries:
        session.refresh(p)
    return JSONResponse(content=[serialize_prayer(p) for p in entries])


@router.get("/prayers")
def list_prayers(date: Optional[str] = None, session: Session = Depends(get_session)):
    target_date = date or today_str()
    prayers = session.exec(select(PrayerLog).where(PrayerLog.date == target_date)).all()
    prayers = sorted(prayers, key=lambda p: PRAYER_ORDER.index(p.prayer_name) if p.prayer_name in PRAYER_ORDER else 99)
    return JSONResponse(content=[serialize_prayer(p) for p in prayers])


@router.patch("/prayers/{prayer_id}")
def update_prayer(prayer_id: str, body: UpdatePrayerBody, session: Session = Depends(get_session)):
    prayer = session.get(PrayerLog, prayer_id)
    if not prayer:
        raise HTTPException(status_code=404, detail="Prayer not found")

    prayer.status = _STATUS_TO.get(body.status)
    if body.scheduledTime is not None:
        prayer.calculated_time = body.scheduledTime
    if body.completedAt is not None:
        prayer.logged_at = datetime.fromisoformat(body.completedAt.replace("Z", "+00:00"))
    elif body.status not in ("pending", "missed"):
        prayer.logged_at = datetime.utcnow()

    session.add(prayer)
    session.commit()
    session.refresh(prayer)
    return JSONResponse(content=serialize_prayer(prayer))
