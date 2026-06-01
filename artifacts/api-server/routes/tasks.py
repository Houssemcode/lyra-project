from __future__ import annotations

from datetime import datetime
from typing import Optional, List as TypingList
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Task, TaskList, Tag, TaskTag
from utils import today_str

router = APIRouter()

PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

# ─── Status / Priority mappings ──────────────────────────────────────────────
_STATUS_TO   = {"pending": "Pending", "done": "Done"}
_STATUS_FROM = {"Pending": "pending", "Done": "done"}
_PRI_TO      = {"none": "None", "low": "Low", "medium": "Medium", "high": "High"}
_PRI_FROM    = {"None": "none", "Low": "low", "Medium": "medium", "High": "high"}
_REC_VALID   = {"daily", "weekly", "monthly"}


# ─── List / Tag helpers ───────────────────────────────────────────────────────
def _get_or_create_list(session: Session, name: Optional[str]) -> Optional[TaskList]:
    if not name:
        return None
    obj = session.exec(
        select(TaskList).where(TaskList.name == name, TaskList.is_archived == False)
    ).first()
    if not obj:
        obj = TaskList(name=name)
        session.add(obj)
        session.commit()
        session.refresh(obj)
    return obj


def _get_or_create_tag(session: Session, name: str) -> Tag:
    obj = session.exec(
        select(Tag).where(Tag.name == name, Tag.is_archived == False)
    ).first()
    if not obj:
        obj = Tag(name=name)
        session.add(obj)
        session.commit()
        session.refresh(obj)
    return obj


def _set_task_tags(session: Session, task_id: str, tag_names: TypingList[str]):
    for tt in session.exec(select(TaskTag).where(TaskTag.task_id == task_id)).all():
        session.delete(tt)
    session.commit()
    for name in (tag_names or []):
        tag = _get_or_create_tag(session, name)
        session.add(TaskTag(task_id=task_id, tag_id=tag.id))
    session.commit()


def _get_task_tag_names(session: Session, task_id: str) -> TypingList[str]:
    tts = session.exec(select(TaskTag).where(TaskTag.task_id == task_id)).all()
    if not tts:
        return []
    tag_ids = [tt.tag_id for tt in tts]
    tags = session.exec(select(Tag).where(Tag.id.in_(tag_ids))).all()
    return [t.name for t in tags]


# ─── Serializer ──────────────────────────────────────────────────────────────
def serialize_task(task: Task, session: Session) -> dict:
    list_name = None
    if task.list_id:
        tl = session.get(TaskList, task.list_id)
        list_name = tl.name if tl else None

    tags = _get_task_tag_names(session, task.id)

    due_date: Optional[str] = None
    due_time: Optional[str] = None
    if task.start_time:
        due_date = task.start_time.strftime("%Y-%m-%d")
        tp = task.start_time.strftime("%H:%M")
        if tp != "00:00":
            due_time = tp

    recurrence = task.recurrence_rule if task.recurrence_rule in _REC_VALID else "none"

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": _STATUS_FROM.get(task.status, "pending"),
        "priority": _PRI_FROM.get(task.priority, "none"),
        "dueDate": due_date,
        "dueTime": due_time,
        "list": list_name,
        "tags": tags,
        "completedAt": task.completed_at.isoformat() if task.completed_at else None,
        "recurrence": recurrence,
        "templateId": task.parent_task_id,
        "createdAt": task.created_at.isoformat(),
        "updatedAt": task.updated_at.isoformat(),
    }


# ─── Recurring helper ─────────────────────────────────────────────────────────
def _should_gen(recurrence: str, template_start: Optional[datetime], target_date: str) -> bool:
    from datetime import date as date_cls
    target = date_cls.fromisoformat(target_date)
    if template_start and date_cls.fromisoformat(target_date) < template_start.date():
        return False
    if recurrence == "daily":
        return True
    if recurrence == "weekly":
        if not template_start:
            return True
        return target.weekday() == template_start.date().weekday()
    if recurrence == "monthly":
        if not template_start:
            return target.day == 1
        return target.day == template_start.date().day
    return False


def _ensure_recurring(session: Session, target_date: str):
    templates = session.exec(
        select(Task).where(
            and_(Task.recurrence_rule != None, Task.parent_task_id == None)
        )
    ).all()
    for tmpl in templates:
        if not _should_gen(tmpl.recurrence_rule or "", tmpl.start_time, target_date):
            continue
        target_start = datetime.fromisoformat(target_date + "T00:00:00")
        target_end = datetime.fromisoformat(target_date + "T23:59:59")
        existing = session.exec(
            select(Task).where(
                and_(
                    Task.parent_task_id == tmpl.id,
                    Task.start_time >= target_start,
                    Task.start_time <= target_end,
                )
            )
        ).first()
        if existing:
            continue
        instance = Task(
            title=tmpl.title,
            description=tmpl.description,
            priority=tmpl.priority,
            list_id=tmpl.list_id,
            start_time=target_start,
            recurrence_rule=None,
            parent_task_id=tmpl.id,
        )
        session.add(instance)
    session.commit()


# ─── Request bodies ───────────────────────────────────────────────────────────
class CreateTaskBody(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "none"
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    tags: Optional[TypingList[str]] = []
    list: Optional[str] = None
    recurrence: Optional[str] = "none"


class UpdateTaskBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    tags: Optional[TypingList[str]] = None
    list: Optional[str] = None
    recurrence: Optional[str] = None


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.get("/tasks/today")
def get_today_tasks(session: Session = Depends(get_session)):
    today = today_str()
    _ensure_recurring(session, today)
    start = datetime.fromisoformat(today + "T00:00:00")
    end = datetime.fromisoformat(today + "T23:59:59")
    tasks = session.exec(
        select(Task).where(and_(Task.start_time >= start, Task.start_time <= end, Task.is_archived == False))
    ).all()
    done = sum(1 for t in tasks if t.status == "Done")
    pending = sum(1 for t in tasks if t.status == "Pending")
    high = sum(1 for t in tasks if t.priority == "High")
    return JSONResponse(content={
        "total": len(tasks),
        "done": done,
        "pending": pending,
        "highPriority": high,
        "tasks": [serialize_task(t, session) for t in tasks],
    })


@router.get("/tasks/recurring")
def list_recurring_tasks(session: Session = Depends(get_session)):
    tasks = session.exec(
        select(Task).where(and_(Task.recurrence_rule != None, Task.parent_task_id == None))
    ).all()
    return JSONResponse(content=[serialize_task(t, session) for t in tasks])


@router.get("/tasks")
def list_tasks(
    date: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    session: Session = Depends(get_session),
):
    if date:
        _ensure_recurring(session, date)

    conditions = [Task.is_archived == False]
    if date:
        start = datetime.fromisoformat(date + "T00:00:00")
        end = datetime.fromisoformat(date + "T23:59:59")
        conditions.append(Task.start_time >= start)
        conditions.append(Task.start_time <= end)
    if status and status != "all":
        conditions.append(Task.status == _STATUS_TO.get(status, status))
    if priority:
        conditions.append(Task.priority == _PRI_TO.get(priority, priority))
    if not date:
        conditions.append(Task.parent_task_id == None)
        conditions.append(Task.recurrence_rule == None)

    tasks = session.exec(select(Task).where(and_(*conditions))).all()
    return JSONResponse(content=[serialize_task(t, session) for t in tasks])


@router.post("/tasks", status_code=201)
def create_task(body: CreateTaskBody, session: Session = Depends(get_session)):
    task_list = _get_or_create_list(session, body.list)
    recurrence = body.recurrence if body.recurrence in _REC_VALID else None

    start_time: Optional[datetime] = None
    if body.dueDate:
        time_part = body.dueTime or "00:00"
        start_time = datetime.fromisoformat(f"{body.dueDate}T{time_part}:00" if len(time_part) == 5 else f"{body.dueDate}T{time_part}")

    task = Task(
        title=body.title,
        description=body.description,
        priority=_PRI_TO.get(body.priority or "none", "None"),
        start_time=start_time,
        list_id=task_list.id if task_list else None,
        recurrence_rule=recurrence,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    _set_task_tags(session, task.id, body.tags or [])
    return JSONResponse(content=serialize_task(task, session), status_code=201)


@router.get("/tasks/{task_id}")
def get_task(task_id: str, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return JSONResponse(content=serialize_task(task, session))


@router.patch("/tasks/{task_id}")
def update_task(task_id: str, body: UpdateTaskBody, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.status is not None:
        task.status = _STATUS_TO.get(body.status, body.status)
        if task.status == "Done":
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None
    if body.priority is not None:
        task.priority = _PRI_TO.get(body.priority, body.priority)
    if body.dueDate is not None:
        time_part = body.dueTime or (task.start_time.strftime("%H:%M") if task.start_time else "00:00")
        task.start_time = datetime.fromisoformat(f"{body.dueDate}T{time_part}:00" if len(time_part) == 5 else f"{body.dueDate}T{time_part}")
    elif body.dueTime is not None and task.start_time:
        d = task.start_time.strftime("%Y-%m-%d")
        task.start_time = datetime.fromisoformat(f"{d}T{body.dueTime}:00" if len(body.dueTime) == 5 else f"{d}T{body.dueTime}")
    if body.list is not None:
        tl = _get_or_create_list(session, body.list)
        task.list_id = tl.id if tl else None
    if body.tags is not None:
        _set_task_tags(session, task.id, body.tags)
    if body.recurrence is not None:
        task.recurrence_rule = body.recurrence if body.recurrence in _REC_VALID else None

    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    return JSONResponse(content=serialize_task(task, session))


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for tt in session.exec(select(TaskTag).where(TaskTag.task_id == task_id)).all():
        session.delete(tt)
    session.delete(task)
    session.commit()
