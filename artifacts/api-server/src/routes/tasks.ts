import { Router, type IRouter } from "express";
import { eq, and, isNull, ne } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
  GetTodayTasksResponse,
  ListRecurringTasksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Recurrence helper ────────────────────────────────────────────────────────
function shouldGenerateInstance(
  recurrence: string,
  templateDueDate: string | null | undefined,
  targetDate: string
): boolean {
  const target = new Date(targetDate + "T00:00:00Z");

  if (templateDueDate) {
    const start = new Date(templateDueDate + "T00:00:00Z");
    if (target < start) return false;
  }

  if (recurrence === "daily") return true;

  if (recurrence === "weekly") {
    if (!templateDueDate) return true;
    const refDay = new Date(templateDueDate + "T00:00:00Z").getUTCDay();
    return target.getUTCDay() === refDay;
  }

  if (recurrence === "monthly") {
    if (!templateDueDate) return target.getUTCDate() === 1;
    const refDayOfMonth = new Date(templateDueDate + "T00:00:00Z").getUTCDate();
    return target.getUTCDate() === refDayOfMonth;
  }

  return false;
}

// Auto-generate recurring task instances for a given date
async function ensureRecurringInstances(date: string): Promise<void> {
  const templates = await db
    .select()
    .from(tasksTable)
    .where(and(ne(tasksTable.recurrence, "none"), isNull(tasksTable.templateId)));

  for (const template of templates) {
    if (!shouldGenerateInstance(template.recurrence, template.dueDate, date)) continue;

    const existing = await db
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(eq(tasksTable.templateId, template.id), eq(tasksTable.dueDate, date)))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(tasksTable).values({
      title: template.title,
      description: template.description,
      priority: template.priority,
      dueDate: date,
      dueTime: template.dueTime,
      list: template.list,
      tags: template.tags,
      recurrence: "none",
      templateId: template.id,
    });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get("/tasks/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  await ensureRecurringInstances(today);

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.dueDate, today));

  const done = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const highPriority = tasks.filter((t) => t.priority === "high").length;

  res.json(
    GetTodayTasksResponse.parse({
      total: tasks.length,
      done,
      pending,
      highPriority,
      tasks: tasks.map(serializeTask),
    })
  );
});

router.get("/tasks/recurring", async (req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(tasksTable)
    .where(and(ne(tasksTable.recurrence, "none"), isNull(tasksTable.templateId)));

  res.json(ListRecurringTasksResponse.parse(templates.map(serializeTask)));
});

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  if (query.data.date) {
    await ensureRecurringInstances(query.data.date);
  }

  let conditions = [];
  if (query.data.date) {
    conditions.push(eq(tasksTable.dueDate, query.data.date));
  }
  if (query.data.status && query.data.status !== "all") {
    conditions.push(eq(tasksTable.status, query.data.status as "pending" | "done"));
  }
  if (query.data.priority) {
    conditions.push(eq(tasksTable.priority, query.data.priority as "none" | "low" | "medium" | "high"));
  }

  // Exclude template tasks (no dueDate, recurrence set) from regular listing
  // unless no date filter is specified (show all)
  if (!query.data.date) {
    conditions.push(isNull(tasksTable.templateId));
    conditions.push(eq(tasksTable.recurrence, "none"));
  }

  const tasks =
    conditions.length > 0
      ? await db.select().from(tasksTable).where(and(...conditions))
      : await db.select().from(tasksTable);

  res.json(ListTasksResponse.parse(tasks.map(serializeTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const recurrence = (parsed.data.recurrence as "none" | "daily" | "weekly" | "monthly") ?? "none";
  const isTemplate = recurrence !== "none";

  const [task] = await db
    .insert(tasksTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: (parsed.data.priority as "none" | "low" | "medium" | "high") ?? "none",
      // Templates use dueDate as reference/start date; non-recurring tasks use it as the actual due date
      dueDate: isTemplate ? (parsed.data.dueDate ?? null) : (parsed.data.dueDate ?? null),
      dueTime: parsed.data.dueTime ?? null,
      list: parsed.data.list ?? null,
      tags: parsed.data.tags ?? [],
      recurrence,
    })
    .returning();

  res.status(201).json(GetTaskResponse.parse(serializeTask(task)));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id));

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(serializeTask(task)));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if ("description" in parsed.data) updateData.description = parsed.data.description;
  if (parsed.data.status != null) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "done") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
  }
  if (parsed.data.priority != null) updateData.priority = parsed.data.priority;
  if ("dueDate" in parsed.data) updateData.dueDate = parsed.data.dueDate;
  if ("dueTime" in parsed.data) updateData.dueTime = parsed.data.dueTime;
  if ("list" in parsed.data) updateData.list = parsed.data.list;
  if (parsed.data.tags != null) updateData.tags = parsed.data.tags;
  if ("recurrence" in parsed.data && parsed.data.recurrence != null) {
    updateData.recurrence = parsed.data.recurrence;
  }

  const [task] = await db
    .update(tasksTable)
    .set(updateData)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(serializeTask(task)));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

function serializeTask(task: typeof tasksTable.$inferSelect) {
  return {
    ...task,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export default router;
