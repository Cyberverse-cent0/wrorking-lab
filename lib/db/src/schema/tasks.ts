import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { taskStatusEnum } from "./projects";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("TODO"),
  assignedToId: text("assigned_to_id"),
  dueDate: timestamp("due_date", { withTimezone: true }),
});

export const insertTaskSchema = createInsertSchema(tasksTable);
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
