from datetime import datetime, date
from typing import Any


def to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def camelify(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {to_camel(k): camelify(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [camelify(item) for item in obj]
    if isinstance(obj, datetime):
        return obj.isoformat() + "Z" if obj.tzinfo is None else obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    return obj


def today_str() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def get_hijri_day(gregorian_date_str: str) -> int:
    """Return the day-of-month in the Hijri calendar for the given Gregorian date (YYYY-MM-DD)."""
    d = date.fromisoformat(gregorian_date_str)
    year, month, day = d.year, d.month, d.day
    if month <= 2:
        year -= 1
        month += 12
    A = year // 100
    B = 2 - A + A // 4
    jd = int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + B - 1524
    l = jd - 1948440 + 10632
    n = (l - 1) // 10631
    l = l - 10631 * n + 354
    j = (10985 - l) // 5316 * (50 * l // 17719) + l // 5670 * (43 * l // 15238)
    l = l - (30 - j) // 15 * (17719 * j // 50) - j // 16 * (15238 * j // 43) + 29
    m = 24 * l // 709
    day_h = l - 709 * m // 24
    return int(day_h)
