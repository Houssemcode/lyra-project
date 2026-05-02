---
Type:
---

**Project Name:** Lyra
**Version:** 1.0 (MVP Phase)
**Core Objective:** To build a unified, self-hosted personal productivity ecosystem that acts as a central database for daily life, culminating in an automated, AI-driven end-of-day review via Telegram.
### 1. The Tech Stack Foundation
To achieve the goals of the MVP and ensure future scalability, the system will utilize the following technologies:
- **Frontend (Dashboard):** Responsive WebApp (responsive Web App for mobile access) with React + Vite and Tailwind CSS.
- **Backend Language:** Python. _(**FastAPI**.)_
- **Database:** 
	- **Source of Truth Database:** PostgreSQL (Hosted in the cloud or on a central home server). **MVP**
	- **Local Cache Database:** SQLite (Runs locally on your device/browser for offline use). 
	- **ORM (Object-Relational Mapper):** SQLModel or SQLAlchemy. _(These allow you to write your Python database models once, and they will work seamlessly for both your PostgreSQL and SQLite databases)._ **MVP**
- **Containerization:** Docker & Docker Compose for unified deployment.
- **Automation Engine:** Self-hosted n8n container.
- **AI Integration:** External LLM API (Groq or DeepSeek) injected with custom system prompts.
- **User Interface (End-of-Day):** Telegram Bot API.
### 2. Core Modules & Data Architecture
The platform is divided into five primary modules that will feed into the unified database.

| **Module Name**       | **Core Functionality**                                                              | **Key Data Points to Track**                           |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Task Management**   | To-do lists, project breakdowns, and priority levels. (same Ticktick)               | Task ID, Title, Status (Pending/Done), Priority, Date. |
| **Habit Tracker**     | Binary tracking of daily routines and lifestyle goals. (same Habitify and Ticktick) | Habit ID, Name, Completion Status (Boolean), Streak.   |
| **Calendar**          | Time-blocking, events, and daily schedule overview. (same Ticktick)                 | Event Title, Start Time, End Time, Category.           |
| **Prayer / Religion** | Tracking spiritual consistency and daily obligations.                               | Prayer Name, Time, Completed (Boolean).                |
| **Focus**             | Pomodoro timer logging and deep work analytics. (same Ticktick)                     | Session ID, Duration (Minutes), Associated Task.       |

### 3. System Data Flow (The "AI Wife" Pipeline)
This defines exactly how the daily automation will trigger and communicate.
1. **Trigger:** n8n Cron node fires daily at 22:30.
2. **Fetch:** n8n executes an HTTP GET request to the Lyra Backend API (e.g., `/api/daily-summary`).
3. **Process:** The backend aggregates data from all 5 modules for the current date and returns a unified JSON object.
4. **AI Generation:** n8n parses the JSON, injects it into the predefined "Wife Persona" system prompt, and calls the Groq/DeepSeek API.
5. **Delivery:** n8n pushes the generated text to the user via the Telegram Bot node.
### 4. Phased Development Roadmap
- **Phase 1 (MVP):** Build the database schema, the backend API, and a basic web dashboard to input and view data.
- **Phase 2 (Deployment):** Wrap the Phase 1 build in Docker. Secure remote access without using file-syncing services.
- **Phase 3 (Automation):** Deploy n8n alongside the app, connect the Telegram Bot, and build the AI workflow.
- **Phase 4 (Notion):** Integrate Notion and make n8n read from notion workspace.
- **Phase 5 (Mobile):** Build a cross-platform app (flutter).
### 5. Functional Specifications per Module
#### 5.1 Task Management
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
| **Tasks $\leftrightarrow$ Automation** | Feed the `Completed_At` data to the n8n pipeline so "The AI Wife" can say: *"You crushed your morning today, finishing 5 tasks before noon!"* |

#### 5.2 Habit Tracker
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
|**Habits ↔ Automation**|Feeds real-time data to n8n so the Telegram Bot can send proactive pings (e.g., "You haven't completed your Evening Reading habit yet to keep your 12-day streak alive!").|
|**Habits ↔ Prayer / Religion**|Daily prayers sync automatically as background habits to monitor spiritual consistency and streaks over time.|
#### 5.3 Calendar
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
|**Calendar ↔ Automation (n8n)**|When n8n triggers the 22:30 evening summary, it queries the _next day's_ Calendar. The AI Wife can say: _"Rest well tonight, you have a packed schedule tomorrow starting with a 9 AM meeting!"_|

#### 5.4 Prayer / Religion
**Core Functions:**
- **Dynamic Geolocation:** Uses your device's location (e.g., Heliopolis, Algeria) or manual coordinates to accurately calculate the daily times for the 5 obligatory prayers (Fajr, Dhuhr, Asr, Maghrib, Isha).
- **Calculation Methods:** Supports standard calculation algorithms (e.g., Muslim World League, Egyptian General Authority of Survey) to ensure exact local accuracy.
- **Hijri Calendar Integration:** Displays the current Islamic date alongside the Gregorian date.	
- **Daily Status Logging:** Allows users to mark each prayer's status. (Enhancement: Instead of just True/False, use an Enum for "On Time," "Late," or "Missed" for deeper personal analytics).
- **Notifications (Adhan):** Triggers a local device alert or audio cue precisely at the calculated start time for each prayer.
- **Fasting / Sunnah Tracker:** An optional toggle to log fasting days (e.g., Mondays/Thursdays, Ramadan).

**Synergy & Cross-Module Links:**
- **Calendar:** Renders the 5 `Calculated_Time` slots as read-only blocks on the daily view.
- **Automation:** Feeds into the evening n8n summary. The AI Wife can say: _"I'm so happy to see you caught all your prayers on time today, especially waking up for Fajr!"_ 
#### 5.5 Focus (Pomodoro)
**Core Functions:**
- **Customizable Intervals:** While the standard is 25m work / 5m break, users can customize work durations, short breaks, and long breaks (e.g., 50/10 intervals).
- **Strict Mode:** An optional setting that disables pausing or abandoning the timer without logging it as an "Interrupted" session.
- **Ambient Audio:** Basic built-in white noise or lofi audio toggles to aid concentration.
- **Session Tagging:** Every focus block must be linked to a specific Task or a general Project Tag to ensure time is accounted for.
- **Lifecycle Logging:** Records the exact start and end times, calculating the true duration of deep work.
- **Analytics Dashboard:** Visualizes daily, weekly, and monthly deep work hours via bar charts or heat maps.

**Synergy & Cross-Module Links:**
- **Task Management:** A task's UI will display the total accumulated `Actual_Duration` from all Pomodoro sessions linked to it (e.g., showing that "Write Report" took 3 Pomodoros / 75 minutes).
- **Automation:** The AI Wife receives the total aggregated focus time. She can say: _"Wow, you logged 4 hours of pure deep work today! You must be exhausted, please relax tonight."_
#### 5.6 Automation & AI (n8n + Telegram)
**Core Structure & Orchestration Engine:**
- **n8n Orchestration:** A self-hosted n8n Docker container running alongside your FastAPI backend, acting as the central nervous system connecting your database, the LLM, and Telegram.
- **LLM Integration:** API connection to Groq or DeepSeek. The LLM acts purely as a reasoning and natural language generation engine, governed by a strict, pre-defined System Prompt (the "Caring Wife" persona).
- **Interface Layer:** The Telegram Bot API serves as the exclusive frontend for this module, providing a conversational UI.

**Core Functions:**
- **Scheduled Daily Briefing:** A cron node triggers precisely at 22:30 every night. It hits a dedicated aggregator endpoint on your backend (e.g., `GET /api/daily-summary`) and feeds the resulting JSON into the LLM to generate the personalized evening message.
- **Proactive Nudges:** Conditional triggers that check for specific criteria during the day (e.g., if it's 20:00 and a high-priority task or a specific prayer is marked "Pending," send a gentle Telegram reminder).
- **Two-Way Interactive Chat (Webhook):** n8n listens for replies via a Telegram Webhook. If you reply, "I just finished reading," n8n uses the LLM to parse the intent, extracts the action, and sends a `POST` request to your backend to mark the "Reading" habit as complete.
- **Contextual Memory:** Utilizing a buffer memory node within n8n (or logging chats to your database) so the AI remembers the flow of the conversation throughout the evening.

**Synergy & Cross-Module Links:**

|**Cross-Module Links**|**Synergy Description (Data Flow & UI Behavior)**|
|---|---|
|**Automation ↔ All Modules**|Automation acts as the ultimate read/write consumer. It relies on a master backend endpoint (`/api/daily-summary`) to fetch a snapshot of Tasks, Habits, Focus time, and Prayers in one single, efficient database query.|
|**Automation ↔ Task Management**|If you text the bot, "Remind me to call the bank tomorrow," n8n parses the text and uses a `POST` request to create a new task in your Task Management module.|
|**Automation ↔ Focus**|Reads the `Actual_Duration` from the Focus module to tailor the AI's empathy (e.g., recognizing exhaustion after 4+ hours of deep work).|

> [!important]- Remember
> 1. Use UUIDs instead of Integer IDs: Since you are using a local SQLite database that syncs to a cloud PostgreSQL database, you must use UUIDs (Universally Unique Identifiers) instead of standard auto-incrementing numbers (like 1, 2, 3) for your database Primary Keys. If your phone creates "Task ID: 4" offline, and your laptop creates "Task ID: 4" offline, the database will crash when they both try to sync to the cloud. UUIDs prevent this entirely.
> 
> 2. Store Everything in UTC: For the Calendar, Prayer, and Focus modules, time is everything. Always save your Start_Time, End_Time, and Completed_At timestamps to PostgreSQL in UTC (Coordinated Universal Time). Let your React frontend convert that UTC time to your local Algerian time zone. This prevents massive bugs if you ever travel or if n8n runs on a server in a different time zone.
> 
> 3. Secure the Backend API: Even though this is self-hosted, you need an authentication layer for your FastAPI backend. I recommend implementing a simple API Key Authentication. Your React app and your n8n container will pass this secret key in their HTTP headers to read/write data. This ensures no one else on the internet can access your /api/daily-summary endpoint

---
# Related to:
- [Lyra - System Architecture & Product Requirements Document (PRD)](Lyra%20-%20System%20Architecture%20&%20Product%20Requirements%20Document%20(PRD).md)