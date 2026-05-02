# Lyra — Personal Productivity Ecosystem

## Overview

Lyra is a personal productivity dashboard with Islamic Life module. Built as a pnpm monorepo with a React + Vite frontend and TypeScript/Express backend on PostgreSQL.

**Current version: v1.2**

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui (wouter routing, framer-motion, recharts)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (direct import `from "zod"`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build**: esbuild
- **Prayer times**: `adhan` npm package (in api-server)

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
| `/islamic` | Islamic Life | Hijri date, Khatmah tracker, Today's Deeds, Deeds Catalog, prayer time calculator |

## DB Schema (lib/db)

### Core tables
- `tasks` — id, title, description, status, priority, dueDate, dueTime, list, tags, completedAt
- `habits` — id, name, category, timeOfDay, type, streak, isArchived
- `habit_logs` — id, habitId, date, status
- `events` — id, title, description, location, startTime, endTime, allDay, category, source
- `prayers` — id, name, date, scheduledTime, status, completedAt
- `focus_sessions` — id, taskId, taskTitle, durationMinutes, status, startedAt, endedAt, notes

### Islamic Life tables (lib/db/src/schema/islamic.ts)
- `quran_progress` — id, currentSurah, currentPage, totalPages (604), dailyTarget, targetDate, notes
- `islamic_activities` — id, name, arabicName, rewardText, category, hijriMonth, hijriDay, dayOfWeek, isActive, sortOrder
- `activity_logs` — id, activityId, status (completed/intended), date, hijriDate, notes, loggedAt

## API Routes (artifacts/api-server)

### Core
- `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `GET /api/tasks/today`
- `GET/POST /api/habits`, `PATCH/DELETE /api/habits/:id`, `GET /api/habits/today`, `POST /api/habits/:id/log`
- `GET/POST /api/events`, `PATCH/DELETE /api/events/:id`
- `GET/POST /api/prayers`, `PATCH /api/prayers/:id`, `POST /api/prayers/seed`, `POST /api/prayers/calculate`
- `GET/POST /api/focus/sessions`, `PATCH/DELETE /api/focus/sessions/:id`, `GET /api/focus/stats`
- `GET /api/daily-summary` — aggregate report for automation

### Islamic Life
- `GET /api/quran` — get current Khatmah progress (404 if not started)
- `POST /api/quran` — init a new Khatmah
- `PATCH /api/quran` — update reading position / settings
- `GET /api/deeds` — list all deeds (`?todayOnly=true` for today-relevant deeds)
- `POST /api/deeds/:id/log` — log a deed as completed/intended
- `GET /api/deeds/logs` — list deed logs (`?date=YYYY-MM-DD` filter)
- `POST /api/prayers/calculate` — calculate prayer times from lat/lng using adhan

## Seed Data

- **islamic_activities**: 13 deeds seeded (dhikr, fasting, prayer, jumu'ah, quran, charity categories)
- Deed filtering logic: `dayOfWeek` (0=Sun–6=Sat), `hijriDay` (13/14/15 for White Days), null = always applicable

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Theme

Dark mode only. Color palette:
- Background: `hsl(226 30% 6%)` (deep navy)
- Primary: `hsl(186 60% 45%)` (teal)
- Fonts: `Plus Jakarta Sans` (body) + `Outfit` (headings/display)

## Important Notes

- **Zod imports**: Always use `import { z } from "zod"` in api-server routes (NOT `zod/v4` — esbuild can't resolve it)
- **Route ordering**: In `prayers.ts`, `/prayers/calculate` and `/prayers/seed` MUST come before `/prayers/:id`
- **Deed category with apostrophe**: DB stores `jumu'ah` (with apostrophe) — in SQL literals use `''` escaping
- **Hijri date**: Computed client-side via `Intl.DateTimeFormat("en-u-ca-islamic")` — no backend dependency
