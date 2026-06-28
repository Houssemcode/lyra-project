from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select, or_

from database import get_session
from models import User
from clerk_auth import hash_password, verify_password, create_access_token, get_current_user_id

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request / response schemas ────────────────────────────────────────────────

class RegisterBody(BaseModel):
    email: str
    username: str
    password: str
    display_name: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


def serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "username": u.username,
        "displayName": u.display_name or u.username,
        "createdAt": u.created_at.isoformat() if u.created_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register")
def register(body: RegisterBody, session: Session = Depends(get_session)):
    # Validate input
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(body.username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")

    # Check uniqueness
    existing = session.exec(
        select(User).where(
            or_(User.email == body.email.lower(), User.username == body.username.lower())
        )
    ).first()
    if existing:
        if existing.email == body.email.lower():
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        email=body.email.lower().strip(),
        username=body.username.lower().strip(),
        display_name=body.display_name or body.username,
        password_hash=hash_password(body.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.id)
    return JSONResponse(content={"token": token, "user": serialize_user(user)})


@router.post("/login")
def login(body: LoginBody, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(User.email == body.email.lower())
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return JSONResponse(content={"token": token, "user": serialize_user(user)})


@router.get("/me")
def get_me(
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse(content=serialize_user(user))
