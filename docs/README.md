# Lyra — Personal Productivity Ecosystem

## Overview

Lyra is a unified, self-hosted personal productivity ecosystem with an advanced Islamic Life module.

**Current version: v1**

## The Tech Stack Foundation

* **Frontend:** React + Vite + Tailwind CSS v4 (Progressive Web App for mobile).
* **Backend / API:** Python (FastAPI).
* **Database:** PostgreSQL.
* **ORM & Validation:** SQLModel (SQLAlchemy + Pydantic) handling dialect switching.

## Pages & Routing

| Route | Page | Features |
| --- | --- | --- |
| `/` | Today | Stats overview: active tasks, pending habits, prayers, focus time. |
| `/tasks` | Tasks | Task Management: CRUD operations, priority filtering, and RRULE recurrences. |
| `/habits` | Habits | Habit Tracker: Log habits, track streaks, and view dynamic custom routines. |
| `/calendar` | Calendar | Read-Only Aggregation Engine: Week/Month views displaying native events, time-blocked tasks, and prayer times. |
| `/focus` | Focus | Pomodoro & Stopwatch timers, strict-mode logging, and weekly deep work charts. |
| `/summary` | Summary | Daily summary report visualization; acts as the live preview for `/api/daily-summary`. |
| `/islamic` | Islamic Life | Hijri date, geolocation prayer calculator, dynamic Khatmah tracker, and Seasonal Protocol dashboard. |

### Functional Specifications per Module
#### Task Management
**Core Functions:**
- **CRUD Operations:** Create, Read, Update, and Delete tasks and subtasks.
- **Data Hierarchy:** Organizes items sequentially into Folders > Lists > Tasks > Subtasks.
- **Tags / Labels:** Cross-folder categorization using colorful tags (e.g., `#Work, #Errands, #LowEnergy`) to filter by context.
- **Prioritization:** Assign priority flag (None, Low, Medium, High) which dictate visual sorting.
- **Scheduling:** Assign specific due dates and exact due times.
- **Recurring Tasks:** Ability to set rules for tasks to repeat (e.g., daily, weekly, every 3rd of the month).
- **Time Blocking:** Utilizing specific start and end times to render tasks sequentially on the Daily and 3-Day views.
- **Reminders / Notifications:** Push notifications or Telegram alerts sent a specific time before a task is due.
- **Rich Text Descriptions:** Markdown-supported notes section inside each task for links, checklists, or long-form text.

**Synergy & Cross-Module Links:**
    Since Lyra is an interconnected ecosystem, you could add specifications on how Task Management interacts with the other core modules:
    Here is the table from the image rendered in Markdown format:

| Cross-Module Link | Specification Idea |
| :--- | :--- |
| **Tasks $\leftrightarrow$ Focus** | Allow a user to start a Pomodoro timer directly from a Task. The time spent automatically logs against that specific Task ID. |
| **Tasks $\leftrightarrow$ Calendar** | Automatically sync tasks that have a `Start_Time` and `End_Time` to the Calendar module so they appear alongside meetings. |

#### Habit Tracker
**Core Functions:**
- **Habit Types:** Supports tracking both positive habits (actions to build) and negative habits (actions to limit or quit).
- **Categorization:** Organizes habits into logical Folders & Areas (e.g., "Health," "Work," "Mindfulness") to cleanly separate life domains.
- **Time-of-Day Routines:** Segregates habits visually into Morning, Afternoon, Evening, or Anytime routines.
- **Quantifiable Goals:** Allows numeric targets (e.g., “Read 15 pages”, “Drink 2L water”).
- **Daily Logging:** Binary input (completed/failed) for predefined daily habits.
- **Skip / Rest Days:** Permits marking a habit as "Skipped" (e.g., a planned rest day for workouts) without resetting or penalizing the active streak.
- **Streak Calculation:** Automated counter that increments upon consecutive daily completions and resets to zero upon a missed day.
- **Archiving:** Safely archives completed, paused, or abandoned habits without deleting historical data, allowing the AI to analyze long-term lifestyle shifts.
- **Notifications:** Standard scheduled time-based reminders directly on the device.

**Synergy & Cross-Module Links:**

|**Cross-Module Link**|**Synergy Description (Data Flow & UI Behavior)**|
|---|---|
|**Habits ↔ Focus**|Launching a timer-based habit (e.g., "Meditate 15 mins") opens a Pomodoro session. When the timer finishes, the habit auto-completes.|
|**Habits ↔ Task Management**|Checking off a specifically linked recurring task (e.g., "Go to the gym") automatically logs the associated "Workout" habit as complete.|
|**Habits ↔ Prayer / Religion**|Daily prayers sync automatically as background habits to monitor spiritual consistency and streaks over time.|
#### Calendar
**Core Functions:**
- **Unified Visual Interfaces:**
	- **Standard Grid Views:** Daily (hour-by-hour vertical timeline), Weekly (7-day column grid), and Monthly (traditional high-level grid).
	- **Agenda/List View:** A continuous vertical scroll of upcoming events, stripping away empty time slots for quick scanning on mobile devices.
	- **Current Time Indicator:** A dynamic, constantly updating horizontal line across the Daily and Weekly views indicating the exact current time.
- **Native Event Management:**
	- **Event Creation:** Dedicated UI to create standalone time-blocked items (e.g., meetings, appointments) independent of the task manager.
	- **Time Parameters:** Inputs for Start/End dates, Start/End times, and a global "All-Day" toggle.
	- **Recurrence Engine:** Support for standard repeating events (daily, weekly, monthly, yearly) and custom intervals.
	- **Event Metadata:** Fields for Title, Description/Notes, Location, and relevant URLs.
- **Read-Only Aggregation Engine & System Logic:**
	- **Data Ingestion:** Automatically queries and overlays time-bound entities from adjacent system modules (Tasks, Prayers).
	- **Visual Differentiation:** Imported Tasks and Prayers are visually distinct from native events (e.g., specific color schemes or inline icons).
	- **Delegated Interaction:** Clicking an aggregated item opens a read-only modal with a call-to-action to "Edit in [Source] Module," strictly enforcing the read-only constraint.
	- **Conflict Resolution:** UI automatically adjusts overlapping blocks to display them side-by-side so no data is hidden.
	- **Notification Triggers:** Local alerting system pushing notifications based on event start times.

**Synergy & Cross-Module Links:**

|**Cross-Module Links**|**Synergy Description (Data Flow & UI Behavior)**|
|---|---|
|**Calendar ↔ Task Management**|Calendar continuously queries the Tasks database for any item with a `Start_Time` and `End_Time` for the current view's date range, rendering them as read-only blocks.|
|**Calendar ↔ Prayer / Religion**|Queries the geolocation-calculated prayer times for the day and renders them as protected, immovable background blocks.|

#### Islamic Life

This module utilizes a **Hijri Calendar Engine** to act as a proactive spiritual companion rather than a passive tracker.

##### Daily Core Functions

- **Dynamic Geolocation:** Calculates 5 daily prayers accurately based on the user's location.
    
- **Status Logging:** Tracks prayers as `On_Time`, `Late`, or `Missed`.
    
- **Trigger-Based Adhkar:** Automatically schedules Morning/Evening Adhkar as actionable items immediately after logging Fajr/Asr as "Completed."
    

##### The Deeds Catalog & Ledger (Islamic Activities)

- **Proactive Sunnah Proposer:** Suggests activities based on the Hijri calendar (e.g., White Days, Ashura).
    
- **Virtue Display:** Displays the specific reward/virtue (`Reward_Text`) for each suggested action to boost motivation.
    
- **Deeds Ledger:** Archives all completed spiritual actions for historical review.
    

##### The Khatmah Engine (Quran Tracker)

- Tracks reading progress (Surah/Page) against a target completion date.
    
- Dynamically calculates how many pages must be read daily to stay on track.
#### Focus (Pomodoro)
**Core Functions:**
- **Customizable Intervals:** While the standard is 25m work / 5m break, users can customize work durations, short breaks, and long breaks (e.g., 50/10 intervals).
- **Strict Mode:** An optional setting that disables pausing or abandoning the timer without logging it as an "Interrupted" session.
- **Ambient Audio:** Basic built-in white noise or lofi audio toggles to aid concentration.
- **Session Tagging:** Every focus block must be linked to a specific Task or a general Project Tag to ensure time is accounted for.
- **Lifecycle Logging:** Records the exact start and end times, calculating the true duration of deep work.
- **Analytics Dashboard:** Visualizes daily, weekly, and monthly deep work hours via bar charts or heat maps.

**Synergy & Cross-Module Links:**
- **Task Management:** A task's UI will display the total accumulated `Actual_Duration` from all Pomodoro sessions linked to it (e.g., showing that "Write Report" took 3 Pomodoros / 75 minutes).

## DB Schema Architecture (SQLModel)

All primary keys in the system are explicitly **UUIDs** to guarantee collision-free syncing. All timestamps are strictly stored in **UTC**.

### Core Modules

* **Task Management:** `Folder`, `List`, `Task`, `Tag`, `TaskTag` (Junction).
* *Key feature:* Uses RFC 5545 `recurrence_rule` strings for repeats.


* **Habit Tracker:** `Routine` (Dynamic defaults), `Habit`, `HabitLog`.
* **Focus:** `FocusSession`.
* *Key feature:* Supports `timer_mode` (Pomodoro vs. Stopwatch) and links directly to Task IDs.


* **Calendar Engine:** `CalendarEvent`.
* *Key feature:* Polymorphic `source_id` handles native events or imported tasks/prayers.



### Islamic Life Module

* **Daily Obligations:** `PrayerLog`.
* **Sunnah & Deeds:** `IslamicActivity` (Catalog), `ActivityLog` (User Ledger).
* **Khatmah Engine:** `Khatmah` (Master goal), `KhatmahSession` (Session ledger linked to Focus time).
* **System Overrides:** `SystemState`, `Protocol` (Priority-based catalog), `ActiveProtocol` (Currently active rules like Ramadan or White Days).

## API Routes (FastAPI)

### Core

* `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}`
* `GET/POST /api/habits`, `POST /api/habits/{id}/log`
* `GET/POST /api/calendar/events` (Aggregates tasks, prayers, and meetings by date range)
* `POST /api/focus/sessions`
* `GET /api/daily-summary` — The master JSON aggregator endpoint.

### Islamic Life

* `POST /api/khatmah/session` — Logs reading progress and auto-updates the parent Khatmah state.
* `GET /api/system-state/protocols` — Evaluates protocol priorities (e.g., overriding standard UI for the Last 10 Days of Ramadan).
* `POST /api/prayers/calculate` — Generates daily times via backend algorithms using local coordinates (e.g., Guelma, Algeria).

## Important Developer Notes

* **Timezone Handling:** Always save `start_time`, `end_time`, and `logged_at` in **UTC**. The React frontend `Intl.DateTimeFormat` handles conversion to local time.
* **Recurrence Logic:** Use `python-dateutil` on the backend to parse `FREQ=DAILY` RRULE strings to determine active habits and next-up tasks.
* **Protocol Priorities:** When querying `ActiveProtocol`, the system must render behaviors based on the highest integer `priority` (e.g., `RAMADAN_LAST_10` [90] visually overrides `JUMUAH_PROTOCOL` [10]).
