---
Type:
---
Here is your fully updated, comprehensive **Master Product Requirements Document (PRD)** for **Project Lyra**.

I have integrated all of your enterprise-grade architectural decisions, the local-first database strategy, and the massive, culturally-aware enhancements to the Islamic Life module (including the Hijri engine, Quran Tracker, Jumu'ah Protocol, and the Ramadan Override).

You can copy this directly into your documentation software (Notion, Obsidian, Markdown) as your official "Version 1.2" blueprint.

---

# Lyra - System Architecture & Product Requirements Document (PRD)

**Project Name:** Lyra

**Version:** 1.2 (MVP & Phase 2 Roadmap)

**Core Objective:** To build a unified, self-hosted personal productivity ecosystem that acts as a central database for daily life, culminating in an automated, AI-driven end-of-day review and spiritual companion via Telegram.

---

### 1. The Tech Stack Foundation

- **Frontend (Dashboard):** React + Vite with Tailwind CSS (designed as a Progressive Web App for mobile).
    
- **Backend / API:** Python utilizing the **FastAPI** framework.
    
- **Source of Truth Database:** PostgreSQL (Hosted in the cloud or on a central home server).
    
- **Local Cache Database:** SQLite (Runs locally on device for offline-first architecture).
    
- **ORM (Object-Relational Mapper):** SQLModel (Handles dialect switching between Postgres and SQLite).
    
- **Containerization:** Docker & Docker Compose.
    
- **Automation Engine:** Self-hosted n8n container.
    
- **AI Integration:** External LLM API (Groq or DeepSeek) injected with custom "AI Wife" system prompts.
    
- **User Interface (End-of-Day):** Telegram Bot API.
    

---

### 2. Core Modules Summary

|**Module Name**|**Core Functionality**|
|---|---|
|**Task Management**|Hierarchical to-do lists (Folders > Lists > Tasks > Subtasks) with tags and time-blocking.|
|**Habit Tracker**|Quantifiable routines categorized by time-of-day, supporting "Skip Days" to protect streaks.|
|**Calendar**|Read-only aggregation engine overlaying Tasks and Prayer Times over native scheduled events.|
|**Prayer & Islamic Life**|Hijri-calendar-driven spiritual companion tracking prayers, Quran progress, and seasonal protocols.|
|**Focus (Pomodoro)**|Strict-mode timers linked to specific tasks for deep-work analytics.|
|**Automation & AI**|The central nervous system connecting the database to the LLM for personalized Telegram interactions.|

---

### 3. Phased Development Roadmap

- **Phase 1 (MVP Backend):** Build the database schema (SQLModel), the FastAPI backend, and PostgreSQL connection.
    
- **Phase 1.5 (Local-First Sync):** Implement the SQLite local caching and syncing mechanism.
    
- **Phase 2 (Frontend & Automation):** Build the React dashboard, deploy n8n, and connect the Telegram Bot AI workflow.
    
- **Phase 3 (Post-MVP Enhancements):** Implement advanced spiritual engines (Quran Tracker, Jumu'ah Protocol, Ramadan Override Protocol).
    
- **Phase 4 (Mobile):** Optimize frontend as a PWA or migrate to Flutter for native cross-platform apps.
    

---

### 4. Functional Specifications per Module

#### 4.1 Task Management

- **Data Hierarchy:** Organizes items sequentially into Folders > Lists > Tasks > Subtasks.
    
- **Core Functions:**
    
    - **Recurring Tasks:** Set rules for tasks to repeat (e.g., daily, every 3rd of the month).
        
    - **Tags / Labels:** Cross-folder categorization using tags (e.g., #Work, #LowEnergy).
        
    - **Time Blocking:** Specific start and end times to render sequentially on Daily visual views.
        
    - **Rich Text:** Markdown-supported descriptions.
        
- **Key Database Fields:** `Title`, `Description`, `Tags`, `Start_Time`, `End_Time`, `Recurrence_Rule`, `Completed_At`.
    

#### 4.2 Habit Tracker

- **Core Functions:**
    
    - **Quantifiable Goals:** Allows numeric targets (e.g., "Read 15 pages", "Drink 2L water").
        
    - **Time-of-Day Routines:** Segregates habits into Morning, Afternoon, Evening.
        
    - **Skip / Rest Days:** Permits marking a habit as "Skipped" without breaking the active streak.
        
    - **Archiving:** Preserves historical data of abandoned habits for AI analysis.
        
- **Key Database Fields:** `Habit_Type` (Binary/Numeric/Timer), `Target_Value`, `Current_Streak`, `Longest_Streak`.
    

#### 4.3 Calendar (Read-Only Aggregation Engine)

- **Core Functions:**
    
    - **Native Events:** Create standalone time-blocked items (meetings, appointments).
        
    - **Data Ingestion:** Automatically queries and overlays time-bound entities from Tasks and Prayer modules.
        
    - **Delegated Interaction:** Clicking an imported Task/Prayer opens a read-only modal with a button to "Edit in Source Module."
        
    - **Conflict Resolution:** UI automatically adjusts overlapping blocks side-by-side.
        
- **Key Database Fields:** `Event_Type` (Native, Task_Import, Prayer_Import), `Start_Time`, `End_Time`, `Is_All_Day`, `Source_ID`.
    

#### 4.4 Focus (Pomodoro)

- **Core Functions:**
    
    - **Task Linkage:** Every focus block must be linked to a specific Task ID.
        
    - **Strict Mode:** Disables pausing; stopping early logs the session as "Interrupted."
        
    - **Analytics:** Aggregates deep work hours daily/weekly.
        
- **Key Database Fields:** `Session_Type`, `Planned_Duration`, `Actual_Duration`, `Status`, `Task_ID`.
    

---

### 5. The Crown Jewel: Prayer & Islamic Life Module

This module utilizes a **Hijri Calendar Engine** to act as a proactive spiritual companion rather than a passive tracker.

#### 5.1 Daily Core Functions

- **Dynamic Geolocation:** Calculates 5 daily prayers accurately based on the user's location.
    
- **Status Logging:** Tracks prayers as `On_Time`, `Late`, or `Missed`.
    
- **Trigger-Based Adhkar:** Automatically schedules Morning/Evening Adhkar as actionable items immediately after logging Fajr/Asr as "Completed."
    

#### 5.2 The Deeds Catalog & Ledger (Islamic Activities)

- **Proactive Sunnah Proposer:** Suggests activities based on the Hijri calendar (e.g., White Days, Ashura).
    
- **Virtue Display:** Displays the specific reward/virtue (`Reward_Text`) for each suggested action to boost motivation.
    
- **Deeds Ledger:** Archives all completed spiritual actions for historical review.
    

#### 5.3 The Khatmah Engine (Quran Tracker)

- Tracks reading progress (Surah/Page) against a target completion date.
    
- Dynamically calculates how many pages must be read daily to stay on track.
    

#### 5.4 Seasonal Protocols (System Overrides)

- **The Jumu'ah Protocol:** A weekly automated checklist activating on Fridays (Ghusl, Kahf, Sa'at al-Istijabah).
    
- **The Ramadan Override Protocol (Month 9):**
    
    - **Habit Auto-Swap:** Automatically pauses conflicting daily routines (e.g., morning coffee) and activates Ramadan-specific habits (Taraweeh, Suhoor).
        
    - **Countdown Mode:** Shifts calendar focus to Imsak (Fajr) and Iftar (Maghrib) timers.
        
    - **Last 10 Nights Escalation:** UI darkens, Quran targets increase, and Qiyam tracking is prioritized.
        

#### 5.5 Islamic Database Schema (SQLModel)

|**Table**|**Key Fields**|**Purpose**|
|---|---|---|
|**PrayerLog**|`Prayer_Name`, `Calculated_Time`, `Status`|Daily obligational tracking.|
|**IslamicActivity**|`Name`, `Reward_Text`, `Hijri_Month`, `Hijri_Day`|The static catalog of Sunnah deeds and their rewards.|
|**ActivityLog**|`Activity_ID`, `Status`, `Hijri_Date`|The user's ledger of completed/intended deeds.|
|**QuranProgress**|`Target_Date`, `Current_Surah`, `Current_Page`|Tracks the active Khatmah.|

---

### 6. Automation & AI (n8n + Telegram)

This module is the conversational interface (The "AI Wife" persona) powered by Groq/DeepSeek via n8n.

**Standard Synergy:**

- **Evening Review (22:30):** Fetches the `/api/daily-summary` (Tasks, Habits, Focus hours, Prayers) and generates a personalized, empathetic summary of the day.
    
- **Interactive Chat:** Parses natural language Telegram replies (e.g., "I finished reading") to trigger POST requests updating the database.
    

**Islamic Life Synergy (Proactive Nudges):**

- **Hijri Awareness:** The AI queries tomorrow's Hijri date. _Example:_ "Tomorrow is the 13th, the start of the White Days. The reward is like fasting the whole year! Should I set a Suhoor alarm?"
    
- **Quran Motivation:** _Example:_ "You only have 4 pages left today to stay on track for your Khatmah!"
    
- **Ramadan Nudges:**
    
    - _Pre-Fajr (Suhoor):_ Wakes the user, encourages Suhoor, and suggests making Dua.
        
    - _Pre-Maghrib (Iftar):_ Reminds the user to put the phone away 15 minutes before sunset for dedicated Dua.
        
    - _Nightly Review:_ Validates Taraweeh completion and encourages rest.
        

---

### 7. Cross-Module Relational Mapping (The Synergy)

| **Source Module** | **Linked Module** | **Database Implementation / Action**                                                        |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| **Focus**         | **Tasks**         | `Focus.task_id` (Foreign Key). Completing a timer adds `Actual_Duration` to the Task.       |
| **Habits**        | **Focus**         | Starting a timer-based habit (e.g., "Meditate 20m") auto-launches the Focus Pomodoro.       |
| **Tasks/Prayers** | **Calendar**      | Calendar queries items with `Start_Time`/`Calculated_Time` for read-only display.           |
| **Habits**        | **Tasks**         | Checking off a specific recurring task (e.g., "Go to Gym") auto-completes the linked Habit. |
| **All Modules**   | **Automation**    | Master endpoint aggregates day's data into a JSON payload for the LLM prompt injection.     |

---
# Related to:
- [Lyra - System Architecture & Product Requirements Document (PRD)](Lyra%20-%20System%20Architecture%20&%20Product%20Requirements%20Document%20(PRD).md)