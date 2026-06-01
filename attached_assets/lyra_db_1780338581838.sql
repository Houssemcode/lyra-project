CREATE TYPE "priority_level" AS ENUM (
  'None',
  'Low',
  'Medium',
  'High'
);

CREATE TYPE "task_status" AS ENUM (
  'Pending',
  'Done'
);

CREATE TYPE "habit_type" AS ENUM (
  'Binary',
  'Numeric',
  'Timer'
);

CREATE TYPE "habit_log_status" AS ENUM (
  'Completed',
  'Failed',
  'Skipped'
);

CREATE TYPE "timer_mode" AS ENUM (
  'Pomodoro',
  'Stopwatch'
);

CREATE TYPE "session_type" AS ENUM (
  'Work',
  'ShortBreak',
  'LongBreak'
);

CREATE TYPE "focus_status" AS ENUM (
  'Completed',
  'Interrupted'
);

CREATE TYPE "event_source" AS ENUM (
  'Native',
  'Task_Import',
  'Prayer_Import'
);

CREATE TYPE "prayer_name" AS ENUM (
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha'
);

CREATE TYPE "prayer_status" AS ENUM (
  'On_Time',
  'Late',
  'Missed'
);

CREATE TYPE "activity_type" AS ENUM (
  'fard',
  'sunnah',
  'mostahab'
);

CREATE TYPE "activity_status" AS ENUM (
  'Intended',
  'Completed'
);

CREATE TYPE "khatmah_type" AS ENUM (
  'Tilawah',
  'Hifz',
  'Murajaah',
  'Tafsir'
);

CREATE TYPE "khatmah_status" AS ENUM (
  'Active',
  'Paused',
  'Completed',
  'Abandoned'
);

CREATE TABLE "Folder" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "created_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "List" (
  "id" uuid PRIMARY KEY,
  "folder_id" uuid,
  "name" varchar,
  "created_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "Tag" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "color" varchar,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "Task" (
  "id" uuid PRIMARY KEY,
  "list_id" uuid,
  "parent_task_id" uuid,
  "title" varchar,
  "description" text,
  "priority" priority_level,
  "status" task_status,
  "start_time" timestamp,
  "end_time" timestamp,
  "recurrence_rule" varchar,
  "completed_at" timestamp,
  "created_at" timestamp,
  "updated_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "TaskTag" (
  "task_id" uuid,
  "tag_id" uuid,
  PRIMARY KEY ("task_id", "tag_id")
);

CREATE TABLE "Routine" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "is_default" boolean DEFAULT false,
  "is_archived" boolean DEFAULT false,
  "created_at" timestamp,
  "archived_at" timestamp
);

CREATE TABLE "Habit" (
  "id" uuid PRIMARY KEY,
  "folder_id" uuid,
  "routine_id" uuid,
  "name" varchar,
  "type" habit_type,
  "recurrence_rule" varchar,
  "target_value" int,
  "current_streak" int DEFAULT 0,
  "longest_streak" int DEFAULT 0,
  "is_archived" boolean DEFAULT false,
  "created_at" timestamp,
  "archived_at" timestamp
);

CREATE TABLE "HabitLog" (
  "id" uuid PRIMARY KEY,
  "habit_id" uuid,
  "date" date,
  "status" habit_log_status,
  "value" int,
  "logged_at" timestamp
);

CREATE TABLE "FocusSession" (
  "id" uuid PRIMARY KEY,
  "task_id" uuid,
  "habit_id" uuid,
  "timer_mode" timer_mode,
  "session_type" session_type,
  "planned_duration" int,
  "actual_duration" int,
  "status" focus_status,
  "started_at" timestamp,
  "ended_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "created_at" timestamp,
  "archived_at" timestamp
);

CREATE TABLE "CalendarEvent" (
  "id" uuid PRIMARY KEY,
  "title" varchar,
  "description" text,
  "location" varchar,
  "url" varchar,
  "start_time" timestamp,
  "end_time" timestamp,
  "is_all_day" boolean,
  "recurrence_rule" varchar,
  "event_type" event_source,
  "source_id" uuid,
  "created_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "PrayerLog" (
  "id" uuid PRIMARY KEY,
  "prayer_name" prayer_name,
  "date" date,
  "calculated_time" timestamp,
  "status" prayer_status,
  "logged_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "created_at" timestamp,
  "archived_at" timestamp
);

CREATE TABLE "IslamicActivity" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "reward_text" text,
  "hijri_month" int,
  "hijri_day" int,
  "type" activity_type,
  "is_archived" boolean DEFAULT false,
  "created_at" timestamp,
  "archived_at" timestamp
);

CREATE TABLE "ActivityLog" (
  "id" uuid PRIMARY KEY,
  "activity_id" uuid,
  "status" activity_status,
  "hijri_date" varchar,
  "logged_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "created_at" timestamp,
  "archived_at" timestamp
);

CREATE TABLE "Khatmah" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "type" khatmah_type,
  "start_date" date,
  "target_date" date,
  "total_pages" int DEFAULT 604,
  "current_page" int DEFAULT 0,
  "status" khatmah_status,
  "created_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "KhatmahSession" (
  "id" uuid PRIMARY KEY,
  "khatmah_id" uuid,
  "focus_session_id" uuid,
  "start_page" int,
  "end_page" int,
  "pages_read" int,
  "duration" int,
  "logged_at" timestamp,
  "is_archived" boolean DEFAULT false,
  "archived_at" timestamp
);

CREATE TABLE "SystemState" (
  "id" uuid PRIMARY KEY,
  "current_hijri_date" varchar,
  "last_n8n_sync" timestamp
);

CREATE TABLE "Protocol" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "key_code" varchar UNIQUE,
  "priority" int,
  "description" text,
  "user_prefer" boolean DEFAULT true,
  "created_at" timestamp
);

CREATE TABLE "ActiveProtocol" (
  "id" uuid PRIMARY KEY,
  "protocol_id" uuid,
  "activated_at" timestamp,
  "expires_at" timestamp
);

CREATE INDEX ON "Task" ("list_id");

CREATE INDEX ON "Task" ("start_time", "end_time");

CREATE INDEX ON "Task" ("status");

CREATE INDEX ON "HabitLog" ("habit_id");

CREATE INDEX ON "HabitLog" ("date");

CREATE INDEX ON "CalendarEvent" ("start_time", "end_time");

CREATE INDEX ON "CalendarEvent" ("source_id");

CREATE INDEX ON "KhatmahSession" ("khatmah_id");

CREATE INDEX ON "ActiveProtocol" ("activated_at", "expires_at");

COMMENT ON COLUMN "Task"."parent_task_id" IS 'Self-referencing for subtasks';

COMMENT ON COLUMN "Task"."start_time" IS 'Stored in UTC';

COMMENT ON COLUMN "Task"."end_time" IS 'Stored in UTC';

COMMENT ON COLUMN "Task"."recurrence_rule" IS 'RFC 5545 RRULE string (e.g., FREQ=DAILY)';

COMMENT ON COLUMN "Task"."completed_at" IS 'Stored in UTC';

COMMENT ON COLUMN "Routine"."name" IS 'by default ther is: Morning, Afternoon, Evening, Anytime';

COMMENT ON COLUMN "Routine"."is_default" IS 'Set to true for the 4 core system defaults';

COMMENT ON COLUMN "Habit"."routine_id" IS 'Replaces the static enum to allow custom routines';

COMMENT ON COLUMN "Habit"."recurrence_rule" IS 'RFC 5545 RRULE to dictate active days';

COMMENT ON COLUMN "Habit"."target_value" IS 'For numeric/timer types';

COMMENT ON COLUMN "HabitLog"."value" IS 'Actual logged value for numeric goals';

COMMENT ON COLUMN "HabitLog"."logged_at" IS 'Stored in UTC';

COMMENT ON COLUMN "FocusSession"."task_id" IS 'Every focus block linked to a task';

COMMENT ON COLUMN "FocusSession"."habit_id" IS 'Optional: If triggered by a timer habit';

COMMENT ON COLUMN "FocusSession"."timer_mode" IS 'Defines if the timer counts down or up';

COMMENT ON COLUMN "FocusSession"."session_type" IS 'Classifies the block as Work or Break';

COMMENT ON COLUMN "FocusSession"."planned_duration" IS 'In minutes. Null if timer_mode is Stopwatch';

COMMENT ON COLUMN "FocusSession"."actual_duration" IS 'In minutes';

COMMENT ON COLUMN "FocusSession"."started_at" IS 'Stored in UTC';

COMMENT ON COLUMN "FocusSession"."ended_at" IS 'Stored in UTC';

COMMENT ON COLUMN "CalendarEvent"."start_time" IS 'Stored in UTC';

COMMENT ON COLUMN "CalendarEvent"."end_time" IS 'Stored in UTC';

COMMENT ON COLUMN "CalendarEvent"."event_type" IS 'Identifies if Native or Imported overlay';

COMMENT ON COLUMN "CalendarEvent"."source_id" IS 'Polymorphic relation: Task.id or PrayerLog.id';

COMMENT ON COLUMN "PrayerLog"."date" IS 'Full date';

COMMENT ON COLUMN "PrayerLog"."calculated_time" IS 'Stored in UTC based on geolocation';

COMMENT ON COLUMN "PrayerLog"."logged_at" IS 'Stored in UTC';

COMMENT ON COLUMN "IslamicActivity"."hijri_month" IS 'Nullable, used for seasonal protocols';

COMMENT ON COLUMN "IslamicActivity"."hijri_day" IS 'Nullable, used for Sunnah proposer';

COMMENT ON COLUMN "ActivityLog"."logged_at" IS 'Stored in UTC';

COMMENT ON COLUMN "Khatmah"."name" IS 'e.g., ختمة رمضان السريعة, حفظ سورة البقرة';

COMMENT ON COLUMN "Khatmah"."target_date" IS 'Nullable if it is an open-ended reading goal';

COMMENT ON COLUMN "Khatmah"."total_pages" IS 'Standard Madani Mushaf pages';

COMMENT ON COLUMN "Khatmah"."current_page" IS 'Auto-updated based on the latest session';

COMMENT ON COLUMN "KhatmahSession"."focus_session_id" IS 'Optional: Links deep-work Hifz to Pomodoro timer';

COMMENT ON COLUMN "KhatmahSession"."pages_read" IS 'Calculated: end_page - start_page';

COMMENT ON COLUMN "KhatmahSession"."duration" IS 'In minutes. Useful for tracking reading speed';

COMMENT ON COLUMN "KhatmahSession"."logged_at" IS 'Stored in UTC';

COMMENT ON TABLE "SystemState" IS 'تمت إزالة الحقل المنطقي العادي واستبداله بنظام جداول البروتوكولات المتعددة الأولوية';

COMMENT ON COLUMN "Protocol"."name" IS 'اسم البروتوكول مثل: رمضان، يوم عرفة، الإثنين والخميس';

COMMENT ON COLUMN "Protocol"."key_code" IS 'رمز برمجي فريد للمحرك الخلفي مثل: RAMADAN, ARAFAH, WHITE_DAYS';

COMMENT ON COLUMN "Protocol"."priority" IS 'القيمة الأعلى تعني أولوية قصوى عند التداخل وتغيير واجهة المستخدم وعادات النظام';

COMMENT ON COLUMN "ActiveProtocol"."activated_at" IS 'وقت التفعيل بالتوقيت العالمي UTC';

COMMENT ON COLUMN "ActiveProtocol"."expires_at" IS 'وقت الانتهاء التلقائي (نهاية اليوم الروحي)';

ALTER TABLE "List" ADD FOREIGN KEY ("folder_id") REFERENCES "Folder" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Task" ADD FOREIGN KEY ("list_id") REFERENCES "List" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Task" ADD FOREIGN KEY ("parent_task_id") REFERENCES "Task" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "TaskTag" ADD FOREIGN KEY ("task_id") REFERENCES "Task" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "TaskTag" ADD FOREIGN KEY ("tag_id") REFERENCES "Tag" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Habit" ADD FOREIGN KEY ("folder_id") REFERENCES "Folder" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Habit" ADD FOREIGN KEY ("routine_id") REFERENCES "Routine" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "HabitLog" ADD FOREIGN KEY ("habit_id") REFERENCES "Habit" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "FocusSession" ADD FOREIGN KEY ("task_id") REFERENCES "Task" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "FocusSession" ADD FOREIGN KEY ("habit_id") REFERENCES "Habit" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ActivityLog" ADD FOREIGN KEY ("activity_id") REFERENCES "IslamicActivity" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "KhatmahSession" ADD FOREIGN KEY ("khatmah_id") REFERENCES "Khatmah" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "KhatmahSession" ADD FOREIGN KEY ("focus_session_id") REFERENCES "FocusSession" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ActiveProtocol" ADD FOREIGN KEY ("protocol_id") REFERENCES "Protocol" ("id") DEFERRABLE INITIALLY IMMEDIATE;
