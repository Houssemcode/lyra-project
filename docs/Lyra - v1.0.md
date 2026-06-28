**Project Name:** Lyra
**Version:** 1.0 (MVP Phase)
**Core Objective:** To build a unified, self-hosted personal productivity ecosystem that acts as a central database for daily life.
### 1. The Tech Stack Foundation
To achieve the goals of the MVP and ensure future scalability, the system will utilize the following technologies:
- **Frontend:** Responsive WebApp with React + Vite and Tailwind CSS.
- **Backend Language:** Python. _(**FastAPI**.)_
- **Database:** 
	- **Local Database:** SQLite (Runs locally on your device/browser for offline use). 
	- **ORM (Object-Relational Mapper):** SQLModel or SQLAlchemy. _(These allow you to write your Python database models once, and they will work seamlessly for SQLite database).
### 2. Core Modules & Data Architecture
The platform is divided into five primary modules that will feed into the unified database.

| **Module Name**       | **Core Functionality**                                                              | **Key Data Points to Track**                           |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Task Management**   | To-do lists, project breakdowns, and priority levels. (same Ticktick)               | Task ID, Title, Status (Pending/Done), Priority, Date. |
| **Habit Tracker**     | Binary tracking of daily routines and lifestyle goals. (same Habitify and Ticktick) | Habit ID, Name, Completion Status (Boolean), Streak.   |
| **Calendar**          | Time-blocking, events, and daily schedule overview. (same Ticktick)                 | Event Title, Start Time, End Time, Category.           |
| **Prayer / Religion** | Tracking spiritual consistency and daily obligations.                               | Prayer Name, Time, Completed (Boolean).                |
| **Focus**             | Pomodoro timer logging and deep work analytics. (same Ticktick)                     | Session ID, Duration (Minutes), Associated Task.       |

### 4. Functional Specifications per Module
#### 4.1 Task Management
**Core Functions:**
- **CRUD Operations:** Create, Read, Update, and Delete tasks and subtasks.
- **Data Hierarchy:** Organizes items sequentially into Folders > Lists > Tasks > Subtasks.
- **Tags / Labels:** Cross-folder categorization using colorful tags (e.g., `#Work, #Errands, #LowEnergy`) to filter by context.
- **Prioritization:** Assign priority flag (None, Low, Medium, High) which dictate visual sorting.
- **Scheduling:** Assign specific due dates and exact due times.
- [ ] **Recurring Tasks:** Ability to set rules for tasks to repeat (e.g., daily, weekly, every 3rd of the month).
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

#### 4.2 Habit Tracker
**Core Functions:**
- **Habit Types:** Supports tracking both positive habits (actions to build) and negative habits (actions to limit or quit).
- **Categorization:** Organizes habits into logical Folders & Areas (e.g., "Health," "Work," "Mindfulness") to cleanly separate life domains.
- **Time-of-Day Routines:** Segregates habits visually into Morning, Afternoon, Evening, or Anytime routines.
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
#### 4.3 Calendar
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

#### 4.4 Prayer / Religion
**Core Functions:**
- **Dynamic Geolocation:** Uses your device's location (e.g., Heliopolis, Algeria) or manual coordinates to accurately calculate the daily times for the 5 obligatory prayers (Fajr, Dhuhr, Asr, Maghrib, Isha).
- **Calculation Methods:** Supports standard calculation algorithms (e.g., Muslim World League, Egyptian General Authority of Survey) to ensure exact local accuracy.
- **Hijri Calendar Integration:** Displays the current Islamic date alongside the Gregorian date.	
- **Daily Status Logging:** Allows users to mark each prayer's status. (Enhancement: Instead of just True/False, use an Enum for "On Time," "Late," or "Missed" for deeper personal analytics).
- **Notifications (Adhan):** Triggers a local device alert or audio cue precisely at the calculated start time for each prayer.
- **Fasting / Sunnah Tracker:** An optional toggle to log fasting days (e.g., Mondays/Thursdays, Ramadan).

**Synergy & Cross-Module Links:**
- **Calendar:** Renders the 5 `Calculated_Time` slots as read-only blocks on the daily view.
#### 4.5 Focus (Pomodoro)
**Core Functions:**
- **Customizable Intervals:** While the standard is 25m work / 5m break, users can customize work durations, short breaks, and long breaks (e.g., 50/10 intervals).
- **Strict Mode:** An optional setting that disables pausing or abandoning the timer without logging it as an "Interrupted" session.
- **Ambient Audio:** Basic built-in white noise or lofi audio toggles to aid concentration.
- **Session Tagging:** Every focus block must be linked to a specific Task or a general Project Tag to ensure time is accounted for.
- **Lifecycle Logging:** Records the exact start and end times, calculating the true duration of deep work.
- **Analytics Dashboard:** Visualizes daily, weekly, and monthly deep work hours via bar charts or heat maps.

**Synergy & Cross-Module Links:**
- **Task Management:** A task's UI will display the total accumulated `Actual_Duration` from all Pomodoro sessions linked to it (e.g., showing that "Write Report" took 3 Pomodoros / 75 minutes).

> [!important]- Remember
> 1. Use UUIDs instead of Integer IDs: Since you are using a local SQLite database, you must use UUIDs (Universally Unique Identifiers) instead of standard auto-incrementing numbers (like 1, 2, 3) for your database Primary Keys. If your phone creates "Task ID: 4" offline, and your laptop creates "Task ID: 4" offline, the database will crash when they both try to sync to the cloud. UUIDs prevent this entirely.
> 
> 2. Store Everything in UTC: For the Calendar, Prayer, and Focus modules, time is everything. Always save your Start_Time, End_Time, and Completed_At timestamps in UTC (Coordinated Universal Time). Let your React frontend convert that UTC time to your local Algerian time zone. This prevents massive bugs if you ever travel or if n8n runs on a server in a different time zone.
