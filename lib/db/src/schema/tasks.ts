import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "done"] }).notNull().default("pending"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] }).notNull().default("none"),
  dueDate: text("due_date"),
  dueTime: text("due_time"),
  list: text("list"),
  tags: text("tags").array().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  recurrence: text("recurrence", { enum: ["none", "daily", "weekly", "monthly"] }).notNull().default("none"),
  templateId: uuid("template_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
