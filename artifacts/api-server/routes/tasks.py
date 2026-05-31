from __future__ import annotations

import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from database import get_session
from models import Task
from utils import camelify, today_str

router = APIRouter()

PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]


def serialize_task(task: Task) -> dict:
    d = task.model_dump()
    d["tags"] = json.loads(task.tags) if isinstance(task.tags, str) else (task.tags or [])
    return camelify(d)


def should_generate_instance(recurrence: str, template_due_date: Optional[str], target_date: str) -> bool:
    from datetime import date as date_cls
    target = date_cls.fromisoformat(target_date)
    if template_due_date:
        start = date_cls.fromisoformat(template_due_date)
        if target < start:
            return False
    if recurrence == "daily":
        return True
    if recurrence == "weekly":
        if not template_due_date:
            return True
        ref_day = date_cls.fromisoformat(template_due_date).weekday()
        return target.weekday() == ref_day
    if recurrence == "monthly":
        if not template_due_date:
            return target.day == 1
        ref_day = date_cls.fromisoformat(template_due_date).day
        return target.day == ref_day
    return False


def ensure_recurring_instances(session: Session, target_date: str):
    templates = session.exec(
        select(Task).where(
            and_(Task.recurrence != "none", Task.template_id == None)
        )
    ).all()
    for template in templates:
        if not should_generate_instance(template.recurrence, template.due_date, target_date):
            continue
        existing = session.exec(
            select(Task).where(
                and_(Task.template_id == template.id, Task.due_date == target_date)
            )
        ).first()
        if existing:
            continue
        instance = Task(
            title=template.title,
            description=template.description,
            priority=template.priority,
            due_date=target_date,
            due_time=template.due_time,
            list=template.list,
            tags=template.tags,
            recurrence="none",
            template_id=template.id,
        )
        session.add(instance)
    session.commit()


class CreateTaskBody(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "none"
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    tags: Optional[List[str]] = []
    list: Optional[str] = None
    recurrence: Optional[str] = "none"


class UpdateTaskBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    tags: Optional[List[str]] = None
    list: Optional[str] = None
    recurrence: Optional[str] = None


@router.get("/tasks/today")
def get_today_tasks(session: Session = Depends(get_session)):
    today = today_str()
    ensure_recurring_instances(session, today)
    tasks = session.exec(select(Task).where(Task.due_date == today)).all()
    done = sum(1 for t in tasks if t.status == "done")
    pending = sum(1 for t in tasks if t.status == "pending")
    high_priority = sum(1 for t in tasks if t.priority == "high")
    return JSONResponse(content=camelify({
        "total": len(tasks),
        "done": done,
        "pending": pending,
        "high_priority": high_priority,
        "tasks": [serialize_task(t) for t in tasks],
    }))


@router.get("/tasks/recurring")
def list_recurring_tasks(session: Session = Depends(get_session)):
    tasks = session.exec(
        select(Task).where(
            and_(Task.recurrence != "none", Task.template_id == None)
        )
    ).all()
    return JSONResponse(content=[serialize_task(t) for t in tasks])


@router.get("/tasks")
def list_tasks(
    date: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    session: Session = Depends(get_session),
):
    if date:
        ensure_recurring_instances(session, date)

    conditions = []
    if date:
        conditions.append(Task.due_date == date)
    if status and status != "all":
        conditions.append(Task.status == status)
    if priority:
        conditions.append(Task.priority == priority)
    if not date:
        conditions.append(Task.template_id == None)
        conditions.append(Task.recurrence == "none")

    query = select(Task)
    if conditions:
        query = query.where(and_(*conditions))

    tasks = session.exec(query).all()
    return JSONResponse(content=[serialize_task(t) for t in tasks])


@router.post("/tasks", status_code=201)
def create_task(body: CreateTaskBody, session: Session = Depends(get_session)):
    recurrence = body.recurrence or "none"
    task = Task(
        title=body.title,
        description=body.description,
        priority=body.priority or "none",
        due_date=body.dueDate,
        due_time=body.dueTime,
        list=body.list,
        tags=json.dumps(body.tags or []),
        recurrence=recurrence,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return JSONResponse(content=serialize_task(task), status_code=201)


@router.get("/tasks/{task_id}")
def get_task(task_id: str, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return JSONResponse(content=serialize_task(task))


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
        task.status = body.status
        if body.status == "done":
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None
    if body.priority is not None:
        task.priority = body.priority
    if body.dueDate is not None:
        task.due_date = body.dueDate
    if body.dueTime is not None:
        task.due_time = body.dueTime
    if body.list is not None:
        task.list = body.list
    if body.tags is not None:
        task.tags = json.dumps(body.tags)
    if body.recurrence is not None:
        task.recurrence = body.recurrence
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)
    return JSONResponse(content=serialize_task(task))


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
