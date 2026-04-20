import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectStatusEnum = pgEnum("project_status", ["DRAFT", "ONGOING", "COMPLETED", "SEEKING_COLLABORATORS"]);
export const visibilityEnum = pgEnum("visibility", ["PUBLIC", "PRIVATE", "INVITE_ONLY"]);
export const memberRoleEnum = pgEnum("member_role", ["LEAD", "CO_LEAD", "CONTRIBUTOR", "VIEWER"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "DECLINED"]);
export const taskStatusEnum = pgEnum("task_status", ["TODO", "IN_PROGRESS", "DONE"]);

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  abstract: text("abstract"),
  keywords: text("keywords").array().notNull().default([]),
  status: projectStatusEnum("status").notNull().default("DRAFT"),
  visibility: visibilityEnum("visibility").notNull().default("PRIVATE"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
