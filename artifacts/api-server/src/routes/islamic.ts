import { Router, type IRouter } from "express";
import { eq, and, or, isNull } from "drizzle-orm";
import { db, quranProgressTable, islamicActivitiesTable, activityLogsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const InitQuranProgressBody = z.object({
  targetDate: z.string().optional().nullable(),
  currentSurah: z.number().int().min(1).max(114).optional(),
  currentPage: z.number().int().min(1).max(604).optional(),
  dailyTarget: z.number().int().min(1).optional(),
  notes: z.string().optional().nullable(),
});

const UpdateQuranProgressBody = z.object({
  currentSurah: z.number().int().min(1).max(114).optional(),
  currentPage: z.number().int().min(1).max(604).optional(),
  targetDate: z.string().optional().nullable(),
  dailyTarget: z.number().int().min(1).optional(),
  notes: z.string().optional().nullable(),
});

const LogDeedBody = z.object({
  status: z.enum(["completed", "intended"]).default("completed"),
  date: z.string().optional(),
  hijriDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Quran Progress ───────────────────────────────────────────────────────────

router.get("/quran", async (_req, res): Promise<void> => {
  const [progress] = await db
    .select()
    .from(quranProgressTable)
    .orderBy(quranProgressTable.createdAt)
    .limit(1);

  if (!progress) {
    res.status(404).json({ error: "No Quran progress found" });
    return;
  }

  res.json(serializeQuran(progress));
});

router.post("/quran", async (req, res): Promise<void> => {
  const parsed = InitQuranProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Calculate daily target if targetDate provided
  let dailyTarget = parsed.data.dailyTarget ?? 2;
  const currentPage = parsed.data.currentPage ?? 1;
  if (parsed.data.targetDate) {
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(parsed.data.targetDate).getTime() - Date.now()) / 86400000)
    );
    const pagesLeft = 604 - currentPage;
    dailyTarget = Math.max(1, Math.ceil(pagesLeft / daysLeft));
  }

  const [progress] = await db
    .insert(quranProgressTable)
    .values({
      targetDate: parsed.data.targetDate ?? null,
      currentSurah: parsed.data.currentSurah ?? 1,
      currentPage,
      dailyTarget,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(serializeQuran(progress));
});

router.patch("/quran", async (req, res): Promise<void> => {
  const parsed = UpdateQuranProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(quranProgressTable).limit(1);
  if (!existing) {
    res.status(404).json({ error: "No Quran progress found. Initialize first." });
    return;
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.currentPage !== undefined) update.currentPage = parsed.data.currentPage;
  if (parsed.data.currentSurah !== undefined) update.currentSurah = parsed.data.currentSurah;
  if (parsed.data.targetDate !== undefined) update.targetDate = parsed.data.targetDate;
  if (parsed.data.dailyTarget !== undefined) update.dailyTarget = parsed.data.dailyTarget;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  // Recalculate daily target if targetDate changed
  if (parsed.data.targetDate && !parsed.data.dailyTarget) {
    const currentPage = (parsed.data.currentPage ?? existing.currentPage);
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(parsed.data.targetDate).getTime() - Date.now()) / 86400000)
    );
    const pagesLeft = 604 - currentPage;
    update.dailyTarget = Math.max(1, Math.ceil(pagesLeft / daysLeft));
  }

  const [updated] = await db
    .update(quranProgressTable)
    .set(update)
    .where(eq(quranProgressTable.id, existing.id))
    .returning();

  res.json(serializeQuran(updated));
});

// ─── Deeds Catalog ────────────────────────────────────────────────────────────

router.get("/deeds", async (req, res): Promise<void> => {
  const todayOnly = req.query.todayOnly === "true";
  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];

  const dayOfWeek = new Date(date + "T12:00:00").getDay(); // 0=Sun … 5=Fri

  const deeds = await db
    .select()
    .from(islamicActivitiesTable)
    .where(eq(islamicActivitiesTable.isActive, true));

  // Filter for today's deeds: always-available (no day_of_week constraint) + today's weekday
  const filtered = todayOnly
    ? deeds.filter((d) => d.dayOfWeek === null || d.dayOfWeek === dayOfWeek)
    : deeds;

  filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  res.json(filtered.map(serializeDeed));
});

router.post("/deeds/:id/log", async (req, res): Promise<void> => {
  const { id } = req.params;
  const parsed = LogDeedBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const date = parsed.data.date ?? new Date().toISOString().split("T")[0];

  const [log] = await db
    .insert(activityLogsTable)
    .values({
      activityId: id,
      status: parsed.data.status,
      date,
      hijriDate: parsed.data.hijriDate ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(serializeLog(log));
});

router.get("/deeds/logs", async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string"
    ? req.query.date
    : new Date().toISOString().split("T")[0];

  const logs = await db
    .select({
      id: activityLogsTable.id,
      activityId: activityLogsTable.activityId,
      status: activityLogsTable.status,
      date: activityLogsTable.date,
      hijriDate: activityLogsTable.hijriDate,
      notes: activityLogsTable.notes,
      loggedAt: activityLogsTable.loggedAt,
      activityName: islamicActivitiesTable.name,
      activityCategory: islamicActivitiesTable.category,
      activityRewardText: islamicActivitiesTable.rewardText,
    })
    .from(activityLogsTable)
    .innerJoin(islamicActivitiesTable, eq(activityLogsTable.activityId, islamicActivitiesTable.id))
    .where(eq(activityLogsTable.date, date));

  res.json(logs.map((l) => ({
    ...l,
    loggedAt: l.loggedAt.toISOString(),
  })));
});

// ─── Serializers ──────────────────────────────────────────────────────────────

function serializeQuran(p: typeof quranProgressTable.$inferSelect) {
  const pagesLeft = p.totalPages - p.currentPage;
  const percentComplete = Math.round((p.currentPage / p.totalPages) * 100);
  let daysToComplete: number | null = null;
  if (p.targetDate) {
    daysToComplete = Math.max(0, Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / 86400000));
  }
  return {
    ...p,
    pagesLeft,
    percentComplete,
    daysToComplete,
    updatedAt: p.updatedAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
  };
}

function serializeDeed(d: typeof islamicActivitiesTable.$inferSelect) {
  return { ...d, createdAt: d.createdAt.toISOString() };
}

function serializeLog(l: typeof activityLogsTable.$inferSelect) {
  return { ...l, loggedAt: l.loggedAt.toISOString() };
}

export default router;
