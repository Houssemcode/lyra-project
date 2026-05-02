import { Router, type IRouter } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(userSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(userSettingsTable).values({}).returning();
  return created;
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetSettingsResponse.parse(serializeSettings(settings)));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = await getOrCreateSettings();
  const updateData: Record<string, unknown> = {};
  if ("displayName" in parsed.data) updateData.displayName = parsed.data.displayName;
  if (parsed.data.prayerMethod != null) updateData.prayerMethod = parsed.data.prayerMethod;
  if (parsed.data.prayerMadhab != null) updateData.prayerMadhab = parsed.data.prayerMadhab;
  if (parsed.data.timeFormat != null) updateData.timeFormat = parsed.data.timeFormat;

  const { eq } = await import("drizzle-orm");
  const [updated] = await db
    .update(userSettingsTable)
    .set(updateData)
    .where(eq(userSettingsTable.id, current.id))
    .returning();

  res.json(UpdateSettingsResponse.parse(serializeSettings(updated)));
});

function serializeSettings(s: typeof userSettingsTable.$inferSelect) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export default router;
