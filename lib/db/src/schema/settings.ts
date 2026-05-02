import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userSettingsTable = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name"),
  prayerMethod: text("prayer_method", {
    enum: [
      "MuslimWorldLeague", "NorthAmerica", "Egyptian", "Karachi",
      "UmmAlQura", "Gulf", "MoonsightingCommittee", "Kuwait",
      "Qatar", "Singapore", "Tehran", "Turkey",
    ],
  }).notNull().default("MoonsightingCommittee"),
  prayerMadhab: text("prayer_madhab", { enum: ["Shafi", "Hanafi"] }).notNull().default("Shafi"),
  timeFormat: text("time_format", { enum: ["12h", "24h"] }).notNull().default("24h"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
