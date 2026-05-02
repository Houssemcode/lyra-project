import { pgTable, text, timestamp, uuid, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Quran Progress (Khatmah Engine) ─────────────────────────────────────────
export const quranProgressTable = pgTable("quran_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  currentSurah: integer("current_surah").notNull().default(1),
  currentPage: integer("current_page").notNull().default(1),
  totalPages: integer("total_pages").notNull().default(604),
  targetDate: text("target_date"),
  dailyTarget: integer("daily_target").notNull().default(2),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuranProgressSchema = createInsertSchema(quranProgressTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuranProgress = z.infer<typeof insertQuranProgressSchema>;
export type QuranProgress = typeof quranProgressTable.$inferSelect;

// ─── Islamic Activities Catalog ───────────────────────────────────────────────
export const islamicActivitiesTable = pgTable("islamic_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  arabicName: text("arabic_name"),
  rewardText: text("reward_text").notNull(),
  category: text("category", {
    enum: ["prayer", "fasting", "quran", "dhikr", "charity", "sunnah", "jumu'ah", "other"],
  }).notNull().default("sunnah"),
  // Scheduling: hijriMonth+hijriDay for lunar dates, dayOfWeek for weekly, null = always available
  hijriMonth: integer("hijri_month"),     // 1-12 or null
  hijriDay: integer("hijri_day"),         // 1-30 or null
  dayOfWeek: integer("day_of_week"),      // 0=Sun,1=Mon,...5=Fri,6=Sat or null
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIslamicActivitySchema = createInsertSchema(islamicActivitiesTable).omit({ id: true, createdAt: true });
export type InsertIslamicActivity = z.infer<typeof insertIslamicActivitySchema>;
export type IslamicActivity = typeof islamicActivitiesTable.$inferSelect;

// ─── Activity Logs (Deeds Ledger) ────────────────────────────────────────────
export const activityLogsTable = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => islamicActivitiesTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["completed", "intended"] }).notNull().default("completed"),
  date: text("date").notNull(),           // Gregorian YYYY-MM-DD
  hijriDate: text("hijri_date"),          // e.g. "15 Sha'ban 1446"
  notes: text("notes"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, loggedAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
