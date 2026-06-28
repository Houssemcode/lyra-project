from __future__ import annotations

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from uuid import uuid4


def gen_uuid() -> str:
    return str(uuid4())


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    email: str = Field(index=True, unique=True)
    username: str = Field(index=True, unique=True)
    display_name: Optional[str] = None
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Folder(SQLModel, table=True):
    __tablename__ = "Folder"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class TaskList(SQLModel, table=True):
    __tablename__ = "List"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    folder_id: Optional[str] = Field(default=None, foreign_key="Folder.id")
    name: str
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class Tag(SQLModel, table=True):
    __tablename__ = "Tag"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str
    color: Optional[str] = None
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class Task(SQLModel, table=True):
    __tablename__ = "Task"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    list_id: Optional[str] = Field(default=None, foreign_key="List.id")
    parent_task_id: Optional[str] = Field(default=None, foreign_key="Task.id")
    title: str
    description: Optional[str] = None
    priority: str = "None"      # None / Low / Medium / High
    status: str = "Pending"     # Pending / Done
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    recurrence_rule: Optional[str] = None   # daily / weekly / monthly
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class TaskTag(SQLModel, table=True):
    __tablename__ = "TaskTag"
    task_id: str = Field(primary_key=True, foreign_key="Task.id")
    tag_id: str = Field(primary_key=True, foreign_key="Tag.id")


class Routine(SQLModel, table=True):
    __tablename__ = "Routine"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str           # Morning / Afternoon / Evening / Anytime
    is_default: bool = False
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = None


class Habit(SQLModel, table=True):
    __tablename__ = "Habit"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    folder_id: Optional[str] = Field(default=None, foreign_key="Folder.id")
    routine_id: Optional[str] = Field(default=None, foreign_key="Routine.id")
    name: str
    type: str = "Binary"        # Binary / Numeric / Timer
    recurrence_rule: Optional[str] = None
    target_value: Optional[int] = None
    current_streak: int = 0
    longest_streak: int = 0
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = None


class HabitLog(SQLModel, table=True):
    __tablename__ = "HabitLog"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    habit_id: str = Field(foreign_key="Habit.id")
    date: str               # YYYY-MM-DD
    status: str             # Completed / Failed / Skipped
    value: Optional[int] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)


class FocusSession(SQLModel, table=True):
    __tablename__ = "FocusSession"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    task_id: Optional[str] = Field(default=None, foreign_key="Task.id")
    habit_id: Optional[str] = Field(default=None, foreign_key="Habit.id")
    timer_mode: str = "Pomodoro"    # Pomodoro / Stopwatch
    session_type: str = "Work"      # Work / ShortBreak / LongBreak
    planned_duration: Optional[int] = None   # minutes
    actual_duration: Optional[int] = None    # minutes
    status: str = "Completed"       # Completed / Interrupted
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = None


class CalendarEvent(SQLModel, table=True):
    __tablename__ = "CalendarEvent"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    is_all_day: bool = False
    recurrence_rule: Optional[str] = None
    event_type: str = "Native"      # Native / Task_Import / Prayer_Import
    source_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class PrayerLog(SQLModel, table=True):
    __tablename__ = "PrayerLog"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    prayer_name: str            # Fajr / Dhuhr / Asr / Maghrib / Isha
    date: str                   # YYYY-MM-DD
    calculated_time: Optional[str] = None   # HH:MM local
    status: Optional[str] = None            # On_Time / Late / Missed (None = pending)
    logged_at: Optional[datetime] = None
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = None


class IslamicActivity(SQLModel, table=True):
    __tablename__ = "IslamicActivity"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: str
    reward_text: Optional[str] = None
    hijri_month: Optional[int] = None
    hijri_day: Optional[int] = None
    type: str = "sunnah"        # fard / sunnah / mostahab
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = None


class ActivityLog(SQLModel, table=True):
    __tablename__ = "ActivityLog"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    activity_id: str = Field(foreign_key="IslamicActivity.id")
    status: str = "Completed"   # Intended / Completed
    hijri_date: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = None


class Khatmah(SQLModel, table=True):
    __tablename__ = "Khatmah"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True)
    name: str = "My Khatmah"
    type: str = "Tilawah"       # Tilawah / Hifz / Murajaah / Tafsir
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    total_pages: int = 604
    current_page: int = 0
    status: str = "Active"      # Active / Paused / Completed / Abandoned
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class KhatmahSession(SQLModel, table=True):
    __tablename__ = "KhatmahSession"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    khatmah_id: str = Field(foreign_key="Khatmah.id")
    focus_session_id: Optional[str] = Field(default=None, foreign_key="FocusSession.id")
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    pages_read: Optional[int] = None
    duration: Optional[int] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    archived_at: Optional[datetime] = None


class SystemState(SQLModel, table=True):
    __tablename__ = "SystemState"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    current_hijri_date: Optional[str] = None
    last_n8n_sync: Optional[datetime] = None


class Protocol(SQLModel, table=True):
    __tablename__ = "Protocol"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    name: Optional[str] = None
    key_code: Optional[str] = Field(default=None, unique=True)
    priority: Optional[int] = None
    description: Optional[str] = None
    user_prefer: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActiveProtocol(SQLModel, table=True):
    __tablename__ = "ActiveProtocol"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    protocol_id: Optional[str] = Field(default=None, foreign_key="Protocol.id")
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class UserSettings(SQLModel, table=True):
    __tablename__ = "user_settings"
    id: str = Field(primary_key=True, default_factory=gen_uuid)
    user_id: Optional[str] = Field(default=None, index=True, unique=True)
    display_name: Optional[str] = None
    prayer_method: str = "MoonsightingCommittee"
    prayer_madhab: str = "Shafi"
    time_format: str = "24h"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
