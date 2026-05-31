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
