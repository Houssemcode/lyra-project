import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  db, tasksTable, habitsTable, habitLogsTable, eventsTable,
  prayersTable, focusSessionsTable, islamicActivitiesTable,
  activityLogsTable, quranProgressTable,
} from "@workspace/db";
import { GetDailySummaryQueryParams, GetDailySummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/daily-summary", async (req, res): Promise<void> => {
  const query = GetDailySummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const date = query.data.date ?? new Date().toISOString().split("T")[0];
  const dayStart = new Date(date + "T00:00:00Z");
  const dayEnd = new Date(date + "T23:59:59Z");

  const [tasksList, habitsList, habitLogs, eventsList, prayersList, focusList, deedLogs, allDeeds, quranList] =
    await Promise.all([
      db.select().from(tasksTable).where(eq(tasksTable.dueDate, date)),
      db.select().from(habitsTable).where(eq(habitsTable.isArchived, false)),
      db.select().from(habitLogsTable).where(eq(habitLogsTable.date, date)),
      db.select().from(eventsTable).where(
        and(gte(eventsTable.startTime, dayStart), lte(eventsTable.startTime, dayEnd))
      ),
      db.select().from(prayersTable).where(eq(prayersTable.date, date)),
      db.select().from(focusSessionsTable).where(
        and(gte(focusSessionsTable.startedAt, dayStart), lte(focusSessionsTable.startedAt, dayEnd))
      ),
      db.select().from(activityLogsTable).where(eq(activityLogsTable.date, date)),
      db.select().from(islamicActivitiesTable).where(eq(islamicActivitiesTable.isActive, true)),
      db.select().from(quranProgressTable).limit(1),
    ]);

  const logMap = new Map(habitLogs.map((l) => [l.habitId, l.status]));

  // Build deed name map
  const deedNameMap = new Map(allDeeds.map((a) => [a.id, a.name]));

  // Compute quran pages read today: compare against yesterday's page
  // (approximation: dailyTarget value from quran progress record)
  const quranRecord = quranList[0] ?? null;

  const completedDeedLogs = deedLogs.filter((l) => l.status === "completed");
  const completedDeedNames = completedDeedLogs
    .map((l) => deedNameMap.get(l.activityId) ?? "Unknown Deed")
    .filter(Boolean);

  const summary = {
    date,
    tasks: {
      total: tasksList.length,
      done: tasksList.filter((t) => t.status === "done").length,
      pending: tasksList.filter((t) => t.status === "pending").length,
      completedTitles: tasksList.filter((t) => t.status === "done").map((t) => t.title),
    },
    habits: {
      total: habitsList.length,
      completed: habitLogs.filter((l) => l.status === "completed").length,
      skipped: habitLogs.filter((l) => l.status === "skipped").length,
      missed: habitLogs.filter((l) => l.status === "missed").length,
      completedNames: habitsList
        .filter((h) => logMap.get(h.id) === "completed")
        .map((h) => h.name),
    },
    prayers: {
      total: prayersList.length,
      onTime: prayersList.filter((p) => p.status === "on_time").length,
      late: prayersList.filter((p) => p.status === "late").length,
      missed: prayersList.filter((p) => p.status === "missed").length,
      pending: prayersList.filter((p) => p.status === "pending").length,
    },
    focus: {
      totalMinutes: focusList.reduce((sum, s) => sum + s.durationMinutes, 0),
      totalSessions: focusList.length,
      completedSessions: focusList.filter((s) => s.status === "completed").length,
    },
    islamic: {
      deedsTotal: allDeeds.length,
      deedsCompleted: completedDeedLogs.length,
      completedDeedNames,
      quranPage: quranRecord?.currentPage ?? null,
      quranPercent: quranRecord
        ? Math.round(((quranRecord.currentPage - 1) / (quranRecord.totalPages - 1)) * 100)
        : null,
      quranPagesReadToday: 0,
    },
    events: eventsList.map((e) => ({
      ...e,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  res.json(GetDailySummaryResponse.parse(summary));
});

export default router;
