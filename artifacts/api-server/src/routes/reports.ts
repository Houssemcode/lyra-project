import { Router, type IRouter } from "express";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import {
  db,
  tasksTable,
  habitLogsTable,
  habitsTable,
  prayersTable,
  focusSessionsTable,
  activityLogsTable,
} from "@workspace/db";
import { GetReportResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const XP = {
  TASK: 10,
  HABIT: 15,
  PRAYER_ONTIME: 20,
  PRAYER_LATE: 8,
  FOCUS_PER_MIN: 1,
  DEED: 12,
} as const;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(isoDate(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

function getWeekBounds(anchor: Date): { start: Date; end: Date } {
  const d = new Date(anchor);
  const dow = d.getUTCDay(); // 0=Sun
  const monday = addDays(d, dow === 0 ? -6 : 1 - dow);
  const sunday = addDays(monday, 6);
  return { start: monday, end: sunday };
}

function getMonthBounds(anchor: Date): { start: Date; end: Date } {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start, end };
}

router.get("/reports", async (req, res): Promise<void> => {
  const period = (req.query.period as string) === "monthly" ? "monthly" : "weekly";
  const anchor = req.query.date
    ? new Date((req.query.date as string) + "T00:00:00Z")
    : new Date();

  const { start, end } =
    period === "monthly" ? getMonthBounds(anchor) : getWeekBounds(anchor);

  const startStr = isoDate(start);
  const endStr = isoDate(end);
  const startTs = new Date(startStr + "T00:00:00.000Z");
  const endTs = new Date(endStr + "T23:59:59.999Z");

  const days = dateRange(start, end);

  // ── Fetch all data in the range ────────────────────────────────────────────
  const [completedTasks, habitLogs, prayers, focusSessions, deedLogs, allHabits] =
    await Promise.all([
      db
        .select({
          completedAt: tasksTable.completedAt,
        })
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.status, "done"),
            gte(tasksTable.completedAt, startTs),
            lte(tasksTable.completedAt, endTs)
          )
        ),

      db
        .select({
          habitId: habitLogsTable.habitId,
          date: habitLogsTable.date,
          status: habitLogsTable.status,
        })
        .from(habitLogsTable)
        .where(
          and(gte(habitLogsTable.date, startStr), lte(habitLogsTable.date, endStr))
        ),

      db
        .select({
          date: prayersTable.date,
          status: prayersTable.status,
        })
        .from(prayersTable)
        .where(
          and(gte(prayersTable.date, startStr), lte(prayersTable.date, endStr))
        ),

      db
        .select({
          startedAt: focusSessionsTable.startedAt,
          durationMinutes: focusSessionsTable.durationMinutes,
        })
        .from(focusSessionsTable)
        .where(
          and(
            gte(focusSessionsTable.startedAt, startTs),
            lte(focusSessionsTable.startedAt, endTs)
          )
        ),

      db
        .select({
          date: activityLogsTable.date,
          status: activityLogsTable.status,
        })
        .from(activityLogsTable)
        .where(
          and(
            gte(activityLogsTable.date, startStr),
            lte(activityLogsTable.date, endStr)
          )
        ),

      db
        .select({ id: habitsTable.id, name: habitsTable.name })
        .from(habitsTable)
        .where(eq(habitsTable.isArchived, false)),
    ]);

  // ── Build day-keyed maps ───────────────────────────────────────────────────
  const tasksByDay = new Map<string, number>();
  for (const t of completedTasks) {
    if (!t.completedAt) continue;
    const d = isoDate(t.completedAt);
    tasksByDay.set(d, (tasksByDay.get(d) ?? 0) + 1);
  }

  // habit log map: date → { completed: Set<habitId>, total: Set<habitId> }
  const habitDayMap = new Map<string, { completed: Set<string>; logged: Set<string> }>();
  for (const l of habitLogs) {
    if (!habitDayMap.has(l.date)) {
      habitDayMap.set(l.date, { completed: new Set(), logged: new Set() });
    }
    const entry = habitDayMap.get(l.date)!;
    entry.logged.add(l.habitId);
    if (l.status === "completed") entry.completed.add(l.habitId);
  }

  // habit breakdown: habitId → completedDays count
  const habitCompletedDaysMap = new Map<string, number>();
  for (const l of habitLogs) {
    if (l.status === "completed") {
      habitCompletedDaysMap.set(l.habitId, (habitCompletedDaysMap.get(l.habitId) ?? 0) + 1);
    }
  }

  type PrayerStatus = { onTime: number; late: number; missed: number };
  const prayerDayMap = new Map<string, PrayerStatus>();
  for (const p of prayers) {
    if (!prayerDayMap.has(p.date)) {
      prayerDayMap.set(p.date, { onTime: 0, late: 0, missed: 0 });
    }
    const entry = prayerDayMap.get(p.date)!;
    if (p.status === "on_time") entry.onTime++;
    else if (p.status === "late") entry.late++;
    else if (p.status === "missed") entry.missed++;
  }

  type FocusStatus = { minutes: number; sessions: number };
  const focusDayMap = new Map<string, FocusStatus>();
  for (const s of focusSessions) {
    const d = isoDate(s.startedAt);
    if (!focusDayMap.has(d)) focusDayMap.set(d, { minutes: 0, sessions: 0 });
    const entry = focusDayMap.get(d)!;
    entry.minutes += s.durationMinutes;
    entry.sessions++;
  }

  const deedDayMap = new Map<string, number>();
  for (const dl of deedLogs) {
    if (dl.status === "completed") {
      deedDayMap.set(dl.date, (deedDayMap.get(dl.date) ?? 0) + 1);
    }
  }

  // ── Build per-day stats ────────────────────────────────────────────────────
  const totalHabits = allHabits.length;
  const dayStats = days.map((date) => {
    const tasks = tasksByDay.get(date) ?? 0;
    const habitEntry = habitDayMap.get(date);
    const habitsCompleted = habitEntry?.completed.size ?? 0;
    const habitsTotal = totalHabits;
    const prayer = prayerDayMap.get(date) ?? { onTime: 0, late: 0, missed: 0 };
    const focus = focusDayMap.get(date) ?? { minutes: 0, sessions: 0 };
    const deeds = deedDayMap.get(date) ?? 0;

    const xp =
      tasks * XP.TASK +
      habitsCompleted * XP.HABIT +
      prayer.onTime * XP.PRAYER_ONTIME +
      prayer.late * XP.PRAYER_LATE +
      Math.min(focus.minutes, 90) * XP.FOCUS_PER_MIN +
      deeds * XP.DEED;

    return {
      date,
      tasksCompleted: tasks,
      habitsCompleted,
      habitsTotal,
      prayersOnTime: prayer.onTime,
      prayersLate: prayer.late,
      prayersMissed: prayer.missed,
      focusMinutes: focus.minutes,
      focusSessions: focus.sessions,
      deedsCompleted: deeds,
      xp,
    };
  });

  // ── Aggregate totals ───────────────────────────────────────────────────────
  const totalTasksCompleted = dayStats.reduce((s, d) => s + d.tasksCompleted, 0);
  const totalHabitsCompleted = dayStats.reduce((s, d) => s + d.habitsCompleted, 0);
  const totalPossibleHabits = totalHabits * days.length;
  const avgHabitRate =
    totalPossibleHabits > 0
      ? Math.round((totalHabitsCompleted / totalPossibleHabits) * 100)
      : 0;
  const totalPrayersOnTime = dayStats.reduce((s, d) => s + d.prayersOnTime, 0);
  const totalPrayersLate = dayStats.reduce((s, d) => s + d.prayersLate, 0);
  const totalPrayersMissed = dayStats.reduce((s, d) => s + d.prayersMissed, 0);
  const totalFocusMinutes = dayStats.reduce((s, d) => s + d.focusMinutes, 0);
  const totalDeedsCompleted = dayStats.reduce((s, d) => s + d.deedsCompleted, 0);
  const totalXp = dayStats.reduce((s, d) => s + d.xp, 0);

  const habitBreakdown = allHabits.map((h) => ({
    habitId: h.id,
    name: h.name,
    completedDays: habitCompletedDaysMap.get(h.id) ?? 0,
    totalDays: days.length,
  }));

  const result = {
    period,
    startDate: startStr,
    endDate: endStr,
    days: dayStats,
    totalXp,
    totalTasksCompleted,
    totalHabitsCompleted,
    avgHabitRate,
    totalPrayersOnTime,
    totalPrayersLate,
    totalPrayersMissed,
    totalFocusMinutes,
    totalDeedsCompleted,
    habitBreakdown,
  };

  res.json(GetReportResponse.parse(result));
});

export default router;
