import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, prayersTable, userSettingsTable } from "@workspace/db";
import {
  ListPrayersQueryParams,
  ListPrayersResponse,
  UpdatePrayerParams,
  UpdatePrayerBody,
  UpdatePrayerResponse,
  SeedPrayersBody,
  SeedPrayersResponse,
} from "@workspace/api-zod";
import { z } from "zod";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

const router: IRouter = Router();

// ─── Calculate prayer times from coordinates ──────────────────────────────────
const CalculateBody = z.object({
  latitude: z.number(),
  longitude: z.number(),
  date: z.string().optional(),
  method: z.string().optional(),
});

router.post("/prayers/calculate", async (req, res): Promise<void> => {
  const parsed = CalculateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { latitude, longitude, date: dateStr } = parsed.data;
  const targetDate = dateStr ?? new Date().toISOString().split("T")[0];
  const calcDate = new Date(targetDate + "T12:00:00");

  // Fetch user settings to get preferred calculation method and madhab
  const settingsRows = await db.select().from(userSettingsTable).limit(1);
  const settings = settingsRows[0];
  const methodName = settings?.prayerMethod ?? "MoonsightingCommittee";
  const madhabName = settings?.prayerMadhab ?? "Shafi";

  let times: Record<string, string>;
  try {
    const adhan = await import("adhan");
    const coords = new adhan.Coordinates(latitude, longitude);
    // Resolve calculation method
    type CalcParams = ReturnType<typeof adhan.CalculationMethod.MoonsightingCommittee>;
    const calcMethods = adhan.CalculationMethod as Record<string, (() => CalcParams) | undefined>;
    const calcParams = calcMethods[methodName]?.() ?? adhan.CalculationMethod.MoonsightingCommittee();
    // Apply madhab
    calcParams.madhab = madhabName === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
    const pt = new adhan.PrayerTimes(coords, calcDate, calcParams);
    const fmt = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    times = {
      Fajr: fmt(pt.fajr),
      Dhuhr: fmt(pt.dhuhr),
      Asr: fmt(pt.asr),
      Maghrib: fmt(pt.maghrib),
      Isha: fmt(pt.isha),
    };
  } catch {
    res.status(500).json({ error: "Prayer time calculation failed" });
    return;
  }

  // Check if already seeded for this date
  const existing = await db.select().from(prayersTable).where(eq(prayersTable.date, targetDate));

  if (existing.length > 0) {
    // Update scheduled times
    for (const prayer of existing) {
      await db
        .update(prayersTable)
        .set({ scheduledTime: times[prayer.name] ?? null })
        .where(eq(prayersTable.id, prayer.id));
    }
    const updated = await db.select().from(prayersTable).where(eq(prayersTable.date, targetDate));
    updated.sort((a, b) => PRAYER_ORDER.indexOf(a.name as typeof PRAYER_ORDER[number]) - PRAYER_ORDER.indexOf(b.name as typeof PRAYER_ORDER[number]));
    res.json(updated.map(serializePrayer));
    return;
  }

  const entries = PRAYER_ORDER.map((name) => ({
    name,
    date: targetDate,
    scheduledTime: times[name] ?? null,
    status: "pending" as const,
  }));

  const inserted = await db.insert(prayersTable).values(entries).returning();
  inserted.sort((a, b) => PRAYER_ORDER.indexOf(a.name as typeof PRAYER_ORDER[number]) - PRAYER_ORDER.indexOf(b.name as typeof PRAYER_ORDER[number]));
  res.json(inserted.map(serializePrayer));
});

// ─── Seed prayers ─────────────────────────────────────────────────────────────
router.post("/prayers/seed", async (req, res): Promise<void> => {
  const parsed = SeedPrayersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, times } = parsed.data;
  const existing = await db.select().from(prayersTable).where(eq(prayersTable.date, date));

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

// ─── List prayers ─────────────────────────────────────────────────────────────
router.get("/prayers", async (req, res): Promise<void> => {
  const query = ListPrayersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const date = query.data.date ?? new Date().toISOString().split("T")[0];
  const prayers = await db.select().from(prayersTable).where(eq(prayersTable.date, date));
  prayers.sort((a, b) => PRAYER_ORDER.indexOf(a.name as typeof PRAYER_ORDER[number]) - PRAYER_ORDER.indexOf(b.name as typeof PRAYER_ORDER[number]));
  res.json(ListPrayersResponse.parse(prayers.map(serializePrayer)));
});

// ─── Update prayer status ─────────────────────────────────────────────────────
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
