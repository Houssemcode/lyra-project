from __future__ import annotations

import os
import time
from typing import Optional

import httpx
from fastapi import Cookie, HTTPException
from jose import JWTError, jwt

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

_jwks_cache: Optional[dict] = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600.0  # 1 hour


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache
    response = httpx.get(
        "https://api.clerk.com/v1/jwks",
        headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
        timeout=10,
    )
    response.raise_for_status()
    _jwks_cache = response.json()
    _jwks_fetched_at = now
    return _jwks_cache


def get_current_user_id(
    __session: Optional[str] = Cookie(default=None),
) -> str:
    if not __session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwks = _get_jwks()
        payload = jwt.decode(
            __session,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return user_id
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid session: {exc}") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Auth error: {exc}") from exc
