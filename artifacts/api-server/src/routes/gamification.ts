import { Router, type IRouter } from "express";
import { eq, and, gte, sql } from "drizzle-orm";
import {
  db,
  tasksTable,
  habitLogsTable,
  habitsTable,
  prayersTable,
  focusSessionsTable,
  activityLogsTable,
} from "@workspace/db";
import { GetGamificationSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const XP = {
  TASK: 10,
  HABIT: 15,
  PRAYER_ONTIME: 20,
  PRAYER_LATE: 8,
  FOCUS_PER_MIN: 1,
  DEED: 12,
} as const;

const XP_PER_LEVEL = 200;

function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0]!;
}

router.get("/gamification", async (_req, res): Promise<void> => {
  const today = todayStr();
  const weekAgo = daysAgoStr(6);
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const weekStart = new Date(`${weekAgo}T00:00:00.000Z`);

  // ── All-time counts ─────────────────────────────────────────────────────────
  const [taskAll] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(tasksTable)
    .where(eq(tasksTable.status, "done"));

  const [habitAll] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(habitLogsTable)
    .where(eq(habitLogsTable.status, "completed"));

  const [prayerOntimeAll] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(prayersTable)
    .where(eq(prayersTable.status, "on_time"));

  const [prayerLateAll] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(prayersTable)
    .where(eq(prayersTable.status, "late"));

  const [focusAll] = await db
    .select({ n: sql<number>`cast(coalesce(sum(least(duration_minutes, 90)), 0) as int)` })
    .from(focusSessionsTable);

  const [deedAll] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(activityLogsTable)
    .where(eq(activityLogsTable.status, "completed"));

  const totalXp =
    (taskAll?.n ?? 0) * XP.TASK +
    (habitAll?.n ?? 0) * XP.HABIT +
    (prayerOntimeAll?.n ?? 0) * XP.PRAYER_ONTIME +
    (prayerLateAll?.n ?? 0) * XP.PRAYER_LATE +
    (focusAll?.n ?? 0) * XP.FOCUS_PER_MIN +
    (deedAll?.n ?? 0) * XP.DEED;

  // ── Today counts ─────────────────────────────────────────────────────────────
  const [taskToday] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(tasksTable)
    .where(and(eq(tasksTable.status, "done"), gte(tasksTable.completedAt, todayStart)));

  const [habitToday] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.status, "completed"), eq(habitLogsTable.date, today)));

  const [prayerOntimeToday] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(prayersTable)
    .where(and(eq(prayersTable.status, "on_time"), eq(prayersTable.date, today)));

  const [prayerLateToday] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(prayersTable)
    .where(and(eq(prayersTable.status, "late"), eq(prayersTable.date, today)));

  const [focusToday] = await db
    .select({ n: sql<number>`cast(coalesce(sum(least(duration_minutes, 90)), 0) as int)` })
    .from(focusSessionsTable)
    .where(gte(focusSessionsTable.startedAt, todayStart));

  const [deedToday] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.status, "completed"), eq(activityLogsTable.date, today)));

  const tTasks = (taskToday?.n ?? 0) * XP.TASK;
  const tHabits = (habitToday?.n ?? 0) * XP.HABIT;
  const tPrayers =
    (prayerOntimeToday?.n ?? 0) * XP.PRAYER_ONTIME +
    (prayerLateToday?.n ?? 0) * XP.PRAYER_LATE;
  const tFocus = (focusToday?.n ?? 0) * XP.FOCUS_PER_MIN;
  const tIslamic = (deedToday?.n ?? 0) * XP.DEED;

  // ── Weekly counts ─────────────────────────────────────────────────────────────
  const [taskWeek] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(tasksTable)
    .where(and(eq(tasksTable.status, "done"), gte(tasksTable.completedAt, weekStart)));

  const [habitWeek] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.status, "completed"), gte(habitLogsTable.date, weekAgo)));

  const [prayerOntimeWeek] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(prayersTable)
    .where(and(eq(prayersTable.status, "on_time"), gte(prayersTable.date, weekAgo)));

  const [prayerLateWeek] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(prayersTable)
    .where(and(eq(prayersTable.status, "late"), gte(prayersTable.date, weekAgo)));

  const [focusWeek] = await db
    .select({ n: sql<number>`cast(coalesce(sum(least(duration_minutes, 90)), 0) as int)` })
    .from(focusSessionsTable)
    .where(gte(focusSessionsTable.startedAt, weekStart));

  const [deedWeek] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.status, "completed"), gte(activityLogsTable.date, weekAgo)));

  const weeklyXp =
    (taskWeek?.n ?? 0) * XP.TASK +
    (habitWeek?.n ?? 0) * XP.HABIT +
    (prayerOntimeWeek?.n ?? 0) * XP.PRAYER_ONTIME +
    (prayerLateWeek?.n ?? 0) * XP.PRAYER_LATE +
    (focusWeek?.n ?? 0) * XP.FOCUS_PER_MIN +
    (deedWeek?.n ?? 0) * XP.DEED;

  // ── Habit streaks ─────────────────────────────────────────────────────────────
  const habits = await db
    .select({
      id: habitsTable.id,
      name: habitsTable.name,
      streak: habitsTable.streak,
      bestStreak: habitsTable.bestStreak,
    })
    .from(habitsTable)
    .where(eq(habitsTable.isArchived, false));

  const level = levelFromXp(totalXp);

  const result = {
    level,
    totalXp,
    currentLevelXp: totalXp % XP_PER_LEVEL,
    nextLevelXp: XP_PER_LEVEL,
    todayScore: {
      total: tTasks + tHabits + tPrayers + tFocus + tIslamic,
      tasks: tTasks,
      habits: tHabits,
      prayers: tPrayers,
      focus: tFocus,
      islamic: tIslamic,
    },
    weeklyXp,
    habitStreaks: habits.map((h) => ({
      habitId: h.id,
      name: h.name,
      streak: h.streak,
      bestStreak: h.bestStreak,
    })),
  };

  res.json(GetGamificationSummaryResponse.parse(result));
});

export default router;
