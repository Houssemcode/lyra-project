import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  ListEventsResponse,
  CreateEventBody,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  if (query.data.start) {
    conditions.push(gte(eventsTable.startTime, new Date(query.data.start)));
  }
  if (query.data.end) {
    conditions.push(lte(eventsTable.startTime, new Date(query.data.end + "T23:59:59Z")));
  }

  const events =
    conditions.length > 0
      ? await db
          .select()
          .from(eventsTable)
          .where(and(...conditions))
      : await db.select().from(eventsTable);

  res.json(ListEventsResponse.parse(events.map(serializeEvent)));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      startTime: new Date(parsed.data.startTime),
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      allDay: parsed.data.allDay ?? false,
      category: parsed.data.category ?? null,
      source: "native",
    })
    .returning();

  res.status(201).json(serializeEvent(event));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if ("description" in parsed.data) updateData.description = parsed.data.description;
  if ("location" in parsed.data) updateData.location = parsed.data.location;
  if (parsed.data.startTime != null) updateData.startTime = new Date(parsed.data.startTime);
  if ("endTime" in parsed.data) updateData.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null;
  if (parsed.data.allDay != null) updateData.allDay = parsed.data.allDay;
  if ("category" in parsed.data) updateData.category = parsed.data.category;

  const [event] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(UpdateEventResponse.parse(serializeEvent(event)));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .delete(eventsTable)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.sendStatus(204);
});

function serializeEvent(event: typeof eventsTable.$inferSelect) {
  return {
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
  };
}

export default router;
