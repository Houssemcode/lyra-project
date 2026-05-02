import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, focusSessionsTable } from "@workspace/db";
import {
  ListFocusSessionsQueryParams,
  ListFocusSessionsResponse,
  CreateFocusSessionBody,
  UpdateFocusSessionParams,
  UpdateFocusSessionBody,
  UpdateFocusSessionResponse,
  DeleteFocusSessionParams,
  GetFocusStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/focus/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  const weekStart = weekAgo.toISOString().split("T")[0];

  const sessions = await db
    .select()
    .from(focusSessionsTable)
    .where(gte(focusSessionsTable.startedAt, new Date(weekStart + "T00:00:00Z")));

  const todaySessions = sessions.filter(
    (s) => s.startedAt.toISOString().split("T")[0] === todayStr
  );
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const weekMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Build daily breakdown for last 7 days
  const dailyMap = new Map<string, { minutes: number; sessions: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { minutes: 0, sessions: 0 });
  }
  for (const s of sessions) {
    const key = s.startedAt.toISOString().split("T")[0];
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!;
      entry.minutes += s.durationMinutes;
      entry.sessions += 1;
    }
  }

  const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    ...v,
  }));

  res.json(
    GetFocusStatsResponse.parse({
      todayMinutes,
      weekMinutes,
      todaySessions: todaySessions.length,
      weekSessions: sessions.length,
      dailyBreakdown,
    })
  );
});

router.get("/focus", async (req, res): Promise<void> => {
  const query = ListFocusSessionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let sessionsList;
  if (query.data.date) {
    const start = new Date(query.data.date + "T00:00:00Z");
    const end = new Date(query.data.date + "T23:59:59Z");
    sessionsList = await db
      .select()
      .from(focusSessionsTable)
      .where(
        and(
          gte(focusSessionsTable.startedAt, start),
          lte(focusSessionsTable.startedAt, end)
        )
      );
  } else {
    sessionsList = await db.select().from(focusSessionsTable);
  }

  res.json(ListFocusSessionsResponse.parse(sessionsList.map(serializeSession)));
});

router.post("/focus", async (req, res): Promise<void> => {
  const parsed = CreateFocusSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(focusSessionsTable)
    .values({
      taskId: parsed.data.taskId ?? null,
      taskTitle: parsed.data.taskTitle ?? null,
      durationMinutes: parsed.data.durationMinutes,
      status: parsed.data.status as "completed" | "interrupted",
      startedAt: new Date(parsed.data.startedAt),
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(serializeSession(session));
});

router.patch("/focus/:id", async (req, res): Promise<void> => {
  const params = UpdateFocusSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFocusSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.durationMinutes != null) updateData.durationMinutes = parsed.data.durationMinutes;
  if (parsed.data.status != null) updateData.status = parsed.data.status;
  if ("endedAt" in parsed.data) updateData.endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : null;
  if ("notes" in parsed.data) updateData.notes = parsed.data.notes;

  const [session] = await db
    .update(focusSessionsTable)
    .set(updateData)
    .where(eq(focusSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Focus session not found" });
    return;
  }
  res.json(UpdateFocusSessionResponse.parse(serializeSession(session)));
});

router.delete("/focus/:id", async (req, res): Promise<void> => {
  const params = DeleteFocusSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .delete(focusSessionsTable)
    .where(eq(focusSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Focus session not found" });
    return;
  }
  res.sendStatus(204);
});

function serializeSession(s: typeof focusSessionsTable.$inferSelect) {
  return {
    ...s,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
  };
}

export default router;
