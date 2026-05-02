import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const focusSessionsTable = pgTable("focus_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id"),
  taskTitle: text("task_title"),
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status", { enum: ["completed", "interrupted"] }).notNull().default("completed"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  notes: text("notes"),
});

export const insertFocusSessionSchema = createInsertSchema(focusSessionsTable).omit({ id: true });
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
