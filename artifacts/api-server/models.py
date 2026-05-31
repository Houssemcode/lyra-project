from __future__ import annotations

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from uuid import uuid4


def gen_uuid() -> str:
    return str(uuid4())


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    title: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "none"
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    list: Optional[str] = None
    tags: str = Field(default="[]")
    completed_at: Optional[datetime] = None
    recurrence: str = "none"
    template_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Habit(SQLModel, table=True):
    __tablename__ = "habits"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str
    category: Optional[str] = None
    time_of_day: str = "anytime"
    type: str = "positive"
    streak: int = 0
    best_streak: int = 0
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HabitLog(SQLModel, table=True):
    __tablename__ = "habit_logs"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    habit_id: str = Field(foreign_key="habits.id")
    date: str
    status: str
    logged_at: datetime = Field(default_factory=datetime.utcnow)


class Event(SQLModel, table=True):
    __tablename__ = "events"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    all_day: bool = False
    category: Optional[str] = None
    source: str = "native"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Prayer(SQLModel, table=True):
    __tablename__ = "prayers"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str
    date: str
    scheduled_time: Optional[str] = None
    status: str = "pending"
    completed_at: Optional[datetime] = None


class FocusSession(SQLModel, table=True):
    __tablename__ = "focus_sessions"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    duration_minutes: int
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None


class QuranProgress(SQLModel, table=True):
    __tablename__ = "quran_progress"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    current_surah: int = 1
    current_page: int = 1
    total_pages: int = 604
    target_date: Optional[str] = None
    daily_target: int = 2
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IslamicActivity(SQLModel, table=True):
    __tablename__ = "islamic_activities"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str
    arabic_name: Optional[str] = None
    reward_text: str
    category: str = "sunnah"
    hijri_month: Optional[int] = None
    hijri_day: Optional[int] = None
    day_of_week: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_logs"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    activity_id: str = Field(foreign_key="islamic_activities.id")
    status: str = "completed"
    date: str
    hijri_date: Optional[str] = None
    notes: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)


class UserSettings(SQLModel, table=True):
    __tablename__ = "user_settings"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    display_name: Optional[str] = None
    prayer_method: str = "MoonsightingCommittee"
    prayer_madhab: str = "Shafi"
    time_format: str = "24h"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
