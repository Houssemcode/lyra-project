import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
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
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.dueDate, today));

  const done = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const highPriority = tasks.filter((t) => t.priority === "high").length;

  const serialized = tasks.map(serializeTask);
  res.json(
    GetTodayTasksResponse.parse({
      total: tasks.length,
      done,
      pending,
      highPriority,
      tasks: serialized,
    })
  );
});

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  if (query.data.date) {
    conditions.push(eq(tasksTable.dueDate, query.data.date));
  }
  if (query.data.status && query.data.status !== "all") {
    conditions.push(
      eq(tasksTable.status, query.data.status as "pending" | "done")
    );
  }
  if (query.data.priority) {
    conditions.push(
      eq(
        tasksTable.priority,
        query.data.priority as "none" | "low" | "medium" | "high"
      )
    );
  }

  const tasks =
    conditions.length > 0
      ? await db
          .select()
          .from(tasksTable)
          .where(and(...conditions))
      : await db.select().from(tasksTable);

  res.json(ListTasksResponse.parse(tasks.map(serializeTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: (parsed.data.priority as "none" | "low" | "medium" | "high") ?? "none",
      dueDate: parsed.data.dueDate ?? null,
      dueTime: parsed.data.dueTime ?? null,
      list: parsed.data.list ?? null,
      tags: parsed.data.tags ?? [],
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
