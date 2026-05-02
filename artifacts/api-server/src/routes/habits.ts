import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, habitsTable, habitLogsTable } from "@workspace/db";
import {
  ListHabitsResponse,
  CreateHabitBody,
  UpdateHabitParams,
  UpdateHabitBody,
  UpdateHabitResponse,
  DeleteHabitParams,
  LogHabitParams,
  LogHabitBody,
  LogHabitResponse,
  GetTodayHabitsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/habits/today", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const habits = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.isArchived, false));

  const logs = await db
    .select()
    .from(habitLogsTable)
    .where(eq(habitLogsTable.date, today));

  const logMap = new Map(logs.map((l) => [l.habitId, l.status]));

  const result = habits.map((h) => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
    todayStatus: logMap.get(h.id) ?? null,
  }));

  res.json(GetTodayHabitsResponse.parse(result));
});

router.get("/habits", async (_req, res): Promise<void> => {
  const habits = await db.select().from(habitsTable);
  res.json(ListHabitsResponse.parse(habits.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))));
});

router.post("/habits", async (req, res): Promise<void> => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [habit] = await db
    .insert(habitsTable)
    .values({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      timeOfDay: (parsed.data.timeOfDay as "morning" | "afternoon" | "evening" | "anytime") ?? "anytime",
      type: (parsed.data.type as "positive" | "negative") ?? "positive",
    })
    .returning();

  res.status(201).json({ ...habit, createdAt: habit.createdAt.toISOString() });
});

router.patch("/habits/:id", async (req, res): Promise<void> => {
  const params = UpdateHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if ("category" in parsed.data) updateData.category = parsed.data.category;
  if (parsed.data.timeOfDay != null) updateData.timeOfDay = parsed.data.timeOfDay;
  if (parsed.data.isArchived != null) updateData.isArchived = parsed.data.isArchived;

  const [habit] = await db
    .update(habitsTable)
    .set(updateData)
    .where(eq(habitsTable.id, params.data.id))
    .returning();

  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.json(UpdateHabitResponse.parse({ ...habit, createdAt: habit.createdAt.toISOString() }));
});

router.delete("/habits/:id", async (req, res): Promise<void> => {
  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [habit] = await db
    .delete(habitsTable)
    .where(eq(habitsTable.id, params.data.id))
    .returning();

  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/habits/:id/log", async (req, res): Promise<void> => {
  const params = LogHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = LogHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Upsert: delete existing log for this date then insert
  await db
    .delete(habitLogsTable)
    .where(
      and(
        eq(habitLogsTable.habitId, params.data.id),
        eq(habitLogsTable.date, parsed.data.date)
      )
    );

  const [log] = await db
    .insert(habitLogsTable)
    .values({
      habitId: params.data.id,
      date: parsed.data.date,
      status: parsed.data.status as "completed" | "skipped" | "missed",
    })
    .returning();

  // Recalculate streak and bestStreak when completed or missed/skipped
  const completedLogs = await db
    .select({ date: habitLogsTable.date })
    .from(habitLogsTable)
    .where(
      and(
        eq(habitLogsTable.habitId, params.data.id),
        eq(habitLogsTable.status, "completed")
      )
    )
    .orderBy(desc(habitLogsTable.date));

  // Current streak: consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < completedLogs.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];
    if (completedLogs[i]!.date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  // Best streak: longest run of consecutive completed days
  const sortedAsc = [...completedLogs].reverse();
  let bestRun = streak > 0 ? streak : (sortedAsc.length > 0 ? 1 : 0);
  let run = sortedAsc.length > 0 ? 1 : 0;
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1]!.date + "T00:00:00Z");
    const curr = new Date(sortedAsc[i]!.date + "T00:00:00Z");
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      bestRun = Math.max(bestRun, run);
    } else {
      run = 1;
    }
  }

  const [existing] = await db
    .select({ bestStreak: habitsTable.bestStreak })
    .from(habitsTable)
    .where(eq(habitsTable.id, params.data.id));

  const newBestStreak = Math.max(existing?.bestStreak ?? 0, bestRun);

  await db
    .update(habitsTable)
    .set({ streak, bestStreak: newBestStreak })
    .where(eq(habitsTable.id, params.data.id));

  res.json(
    LogHabitResponse.parse({
      ...log,
      loggedAt: log.loggedAt.toISOString(),
    })
  );
});

export default router;
