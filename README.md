# Lyra — Personal Productivity Ecosystem

A personal productivity dashboard with an Islamic Life module. Built as a pnpm monorepo with a React + Vite frontend and a Python FastAPI backend on PostgreSQL.

---

## Features

| Module | Description |
|--------|-------------|
| **Today** | Daily overview — tasks, habits, prayers, focus time, events |
| **Tasks** | Create/edit tasks with priority, due date, tags, lists, and recurrence |
| **Habits** | Track daily habits with streaks, grouped by time of day |
| **Calendar** | Week view for events |
| **Prayers** | Log 5 daily prayers (on time / late / missed) with prayer time calculator |
| **Focus** | Pomodoro timer with session logging and weekly chart |
| **Islamic Life** | Hijri date, Khatmah (Quran) tracker, daily deeds catalog |
| **Summary** | Daily productivity report |
| **Reports** | Weekly/monthly breakdown with XP gamification |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS v4 + shadcn/ui |
| Routing | Wouter |
| Animation | Framer Motion |
| Charts | Recharts |
| API Client | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Backend | Python 3.11 + FastAPI + SQLModel |
| Database | PostgreSQL (via `psycopg2`) |
| ORM | SQLModel (SQLAlchemy under the hood) |
| Monorepo | pnpm workspaces |
| Node.js | v24 |

---

## Project Structure

```
/
├── artifacts/
│   ├── lyra/          # React + Vite frontend  (port 21533)
│   └── api-server/    # Python FastAPI backend  (port 8080)
├── lib/
│   ├── db/            # Drizzle ORM schema (shared TypeScript)
│   └── api-client-react/  # Generated React Query hooks
├── scripts/           # Utility scripts
├── pnpm-workspace.yaml
└── README.md
```

### Backend layout (`artifacts/api-server/`)

```
main.py          # App entry point, router registration, startup hooks
database.py      # Engine + session setup
models.py        # SQLModel table definitions
seed.py          # Default Routines + Islamic activities
utils.py         # Helpers (today_str, camelify, get_hijri_day)
routes/
  tasks.py       # /api/tasks
  habits.py      # /api/habits
  events.py      # /api/events
  prayers.py     # /api/prayers  (includes built-in prayer time calculator)
  focus.py       # /api/focus
  islamic.py     # /api/quran, /api/deeds
  settings.py    # /api/settings
  gamification.py  # /api/gamification
  reports.py     # /api/reports
  daily_summary.py # /api/daily-summary
  export.py      # /api/export
```

---

## Database Schema

### Core tables
| Table | Key columns |
|-------|-------------|
| `Task` | title, description, status (Pending/Done), priority, start_time, recurrence_rule |
| `List` | name — task list grouping |
| `Tag` / `TaskTag` | tag names + task↔tag junction |
| `Routine` | Morning / Afternoon / Evening / Anytime |
| `Habit` | name, routine_id, folder_id, type (Binary/Numeric/Timer), streaks |
| `HabitLog` | habit_id, date, status (Completed/Skipped/Failed) |
| `CalendarEvent` | title, start_time, end_time, is_all_day, event_type |
| `PrayerLog` | prayer_name, date, calculated_time, status (On_Time/Late/Missed) |
| `FocusSession` | task_id, planned_duration, actual_duration, status, started_at |
| `Khatmah` | name, current_page, total_pages (604), target_date |
| `IslamicActivity` | name, reward_text, type (fard/sunnah/mostahab), hijri_day |
| `ActivityLog` | activity_id, status (Completed/Intended), logged_at, hijri_date |
| `UserSettings` | display_name, prayer_method, prayer_madhab, time_format |

Tables are created automatically on first server startup — no migration scripts needed.

---

## Running Locally

### Prerequisites
- Node.js 24 + pnpm (`npm install -g pnpm`)
- Python 3.11+
- PostgreSQL **or** use SQLite (no extra setup)

### 1. Clone & install Node dependencies
```bash
pnpm install
```

### 2. Install Python dependencies
```bash
cd artifacts/api-server
pip install fastapi uvicorn sqlmodel psycopg2-binary watchfiles
```

### 3. Set up the database

**Option A — SQLite (simplest)**
```bash
# In artifacts/api-server/database.py, change:
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lyra.db")
```

**Option B — PostgreSQL**
```bash
psql -U postgres -c "CREATE DATABASE lyra;"
export DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/lyra
```

### 4. Start the API server
```bash
cd artifacts/api-server
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Tables and seed data are created automatically on first startup.

### 5. Start the frontend (separate terminal)
```bash
pnpm --filter @workspace/lyra run dev
```

Open **http://localhost:21533**

---

## API Endpoints

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/today` | Today's tasks with stats |
| GET | `/api/tasks/recurring` | Recurring task templates |
| GET/PATCH/DELETE | `/api/tasks/:id` | Get / update / delete task |

### Habits
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/habits` | List all habits |
| POST | `/api/habits` | Create habit |
| GET | `/api/habits/today` | Today's habits with log status |
| PATCH/DELETE | `/api/habits/:id` | Update / delete habit |
| POST | `/api/habits/:id/log` | Log habit for a date |

### Prayers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prayers` | Today's prayer logs |
| POST | `/api/prayers/calculate` | Calculate prayer times from lat/lng |
| POST | `/api/prayers/seed` | Seed blank prayer entries for a date |
| PATCH | `/api/prayers/:id` | Update prayer status |

### Focus
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/focus` | List sessions |
| POST | `/api/focus` | Create session |
| GET | `/api/focus/stats` | Weekly stats + daily breakdown |
| PATCH/DELETE | `/api/focus/:id` | Update / delete session |

### Islamic Life
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quran` | Current Khatmah progress |
| POST | `/api/quran` | Initialize a new Khatmah |
| PATCH | `/api/quran` | Update reading position |
| GET | `/api/deeds` | List all deeds (`?todayOnly=true`) |
| POST | `/api/deeds/:id/log` | Log a deed |
| GET | `/api/deeds/logs` | Deed logs (`?date=YYYY-MM-DD`) |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Calendar events |
| POST/PATCH/DELETE | `/api/events` `/api/events/:id` | CRUD events |
| GET/PATCH | `/api/settings` | User settings |
| GET | `/api/gamification` | XP, level, streaks |
| GET | `/api/reports` | Weekly/monthly report |
| GET | `/api/daily-summary` | Aggregated daily report |
| GET | `/api/export` | Full data export (JSON) |
| GET | `/api/healthz` | Health check |

---

## Key Commands

```bash
# Full TypeScript typecheck
pnpm run typecheck

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Run frontend only
pnpm --filter @workspace/lyra run dev

# Run backend only (from artifacts/api-server/)
uvicorn main:app --reload
```

---

## Theme

Dark mode only.

| Token | Value |
|-------|-------|
| Background | `hsl(226 30% 6%)` — deep navy |
| Primary | `hsl(186 60% 45%)` — teal |
| Body font | Plus Jakarta Sans |
| Display font | Outfit |
