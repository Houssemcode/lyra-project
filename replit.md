# Lyra — Personal Productivity Ecosystem

## Overview

Lyra is a personal productivity dashboard with 5 modules: Task Management, Habit Tracker, Calendar, Prayer Tracker, and Focus/Pomodoro. Built as a pnpm monorepo with a React + Vite frontend and TypeScript/Express backend on PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui (wouter routing, framer-motion, recharts)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build**: esbuild

## Artifacts

| Artifact | Path | Port | Description |
|----------|------|------|-------------|
| `artifacts/lyra` | `/` | 21533 | React frontend |
| `artifacts/api-server` | `/api` | 8080 | Express API |

## Pages

| Route | Page | Features |
|-------|------|---------|
| `/` | Today | Stats overview: tasks, habits, prayers, focus time, events |
| `/tasks` | Tasks | CRUD tasks, filter by status/priority, mark complete |
| `/habits` | Habits | Log habits (complete/skip/miss), streaks, grouped by time of day |
| `/calendar` | Calendar | Week view, create/delete events |
| `/prayers` | Prayers | 5 daily prayers with on_time/late/missed status |
| `/focus` | Focus | Pomodoro timer, session logging, weekly bar chart |
| `/summary` | Summary | Daily summary report, powers `/api/daily-summary` |

## DB Schema (lib/db)

- `tasks` — id, title, description, status, priority, dueDate, dueTime, list, tags, completedAt
- `habits` — id, name, category, timeOfDay, type, streak, isArchived
- `habit_logs` — id, habitId, date, status
- `events` — id, title, description, location, startTime, endTime, allDay, category, source
- `prayers` — id, name, date, scheduledTime, status, completedAt
- `focus_sessions` — id, taskId, taskTitle, durationMinutes, status, startedAt, endedAt, notes

## API Routes (artifacts/api-server)

- `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `GET /api/tasks/today`
- `GET/POST /api/habits`, `PATCH/DELETE /api/habits/:id`, `GET /api/habits/today`, `POST /api/habits/:id/log`
- `GET/POST /api/events`, `PATCH/DELETE /api/events/:id`
- `GET/POST /api/prayers`, `PATCH /api/prayers/:id`, `POST /api/prayers/seed`
- `GET/POST /api/focus/sessions`, `PATCH/DELETE /api/focus/sessions/:id`, `GET /api/focus/stats`
- `GET /api/daily-summary` — aggregate report for n8n/Telegram automation

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Theme

Dark mode only. Color palette:
- Background: `hsl(226 30% 6%)` (deep navy)
- Primary: `hsl(186 60% 45%)` (teal)
- Fonts: `Plus Jakarta Sans` (body) + `Outfit` (headings/display)
