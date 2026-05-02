import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prayersTable = pgTable("prayers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name", { enum: ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] }).notNull(),
  date: text("date").notNull(),
  scheduledTime: text("scheduled_time"),
  status: text("status", { enum: ["pending", "on_time", "late", "missed"] }).notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertPrayerSchema = createInsertSchema(prayersTable).omit({ id: true });
export type InsertPrayer = z.infer<typeof insertPrayerSchema>;
export type Prayer = typeof prayersTable.$inferSelect;
