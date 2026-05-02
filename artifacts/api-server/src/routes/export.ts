import { Router, type IRouter } from "express";
import {
  db,
  tasksTable,
  habitsTable,
  habitLogsTable,
  eventsTable,
  prayersTable,
  focusSessionsTable,
  quranProgressTable,
  islamicActivitiesTable,
  activityLogsTable,
  userSettingsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/export", async (req, res): Promise<void> => {
  const [
    tasks,
    habits,
    habitLogs,
    events,
    prayers,
    focusSessions,
    quranProgressRows,
    islamicActivities,
    activityLogs,
    settingsRows,
  ] = await Promise.all([
    db.select().from(tasksTable).orderBy(tasksTable.createdAt),
    db.select().from(habitsTable).orderBy(habitsTable.createdAt),
    db.select().from(habitLogsTable).orderBy(habitLogsTable.loggedAt),
    db.select().from(eventsTable).orderBy(eventsTable.createdAt),
    db.select().from(prayersTable).orderBy(prayersTable.date),
    db.select().from(focusSessionsTable).orderBy(focusSessionsTable.startedAt),
    db.select().from(quranProgressTable).limit(1),
    db.select().from(islamicActivitiesTable).orderBy(islamicActivitiesTable.createdAt),
    db.select().from(activityLogsTable).orderBy(activityLogsTable.loggedAt),
    db.select().from(userSettingsTable).limit(1),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    app: "Lyra",
    data: {
      settings: settingsRows[0] ?? null,
      tasks,
      habits,
      habitLogs,
      events,
      prayers,
      focusSessions,
      quranProgress: quranProgressRows[0] ?? null,
      islamicActivities,
      activityLogs,
    },
  };

  res.setHeader("Content-Type", "application/json");
  res.json(payload);
});

export default router;
