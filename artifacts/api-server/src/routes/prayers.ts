import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, prayersTable } from "@workspace/db";
import {
  ListPrayersQueryParams,
  ListPrayersResponse,
  UpdatePrayerParams,
  UpdatePrayerBody,
  UpdatePrayerResponse,
  SeedPrayersBody,
  SeedPrayersResponse,
} from "@workspace/api-zod";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

const router: IRouter = Router();

router.post("/prayers/seed", async (req, res): Promise<void> => {
  const parsed = SeedPrayersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, times } = parsed.data;

  // Check if already seeded
  const existing = await db
    .select()
    .from(prayersTable)
    .where(eq(prayersTable.date, date));

  if (existing.length > 0) {
    res.json(SeedPrayersResponse.parse(existing.map(serializePrayer)));
    return;
  }

  const entries = PRAYER_ORDER.map((name) => ({
    name,
    date,
    scheduledTime: times?.[name] ?? null,
    status: "pending" as const,
  }));

  const inserted = await db.insert(prayersTable).values(entries).returning();
  res.json(SeedPrayersResponse.parse(inserted.map(serializePrayer)));
});

router.get("/prayers", async (req, res): Promise<void> => {
  const query = ListPrayersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const date = query.data.date ?? new Date().toISOString().split("T")[0];
  const prayers = await db
    .select()
    .from(prayersTable)
    .where(eq(prayersTable.date, date));

  // Sort by canonical order
  prayers.sort(
    (a, b) =>
      PRAYER_ORDER.indexOf(a.name as typeof PRAYER_ORDER[number]) -
      PRAYER_ORDER.indexOf(b.name as typeof PRAYER_ORDER[number])
  );

  res.json(ListPrayersResponse.parse(prayers.map(serializePrayer)));
});

router.patch("/prayers/:id", async (req, res): Promise<void> => {
  const params = UpdatePrayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePrayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if ("scheduledTime" in parsed.data) updateData.scheduledTime = parsed.data.scheduledTime;
  if ("completedAt" in parsed.data) {
    updateData.completedAt = parsed.data.completedAt ? new Date(parsed.data.completedAt) : null;
  } else if (parsed.data.status !== "pending" && parsed.data.status !== "missed") {
    updateData.completedAt = new Date();
  }

  const [prayer] = await db
    .update(prayersTable)
    .set(updateData)
    .where(eq(prayersTable.id, params.data.id))
    .returning();

  if (!prayer) {
    res.status(404).json({ error: "Prayer not found" });
    return;
  }
  res.json(UpdatePrayerResponse.parse(serializePrayer(prayer)));
});

function serializePrayer(prayer: typeof prayersTable.$inferSelect) {
  return {
    ...prayer,
    completedAt: prayer.completedAt?.toISOString() ?? null,
  };
}

export default router;
