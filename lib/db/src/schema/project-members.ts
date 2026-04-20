import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { memberRoleEnum } from "./projects";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectMembersTable = pgTable("project_members", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id").notNull(),
  role: memberRoleEnum("role").notNull().default("CONTRIBUTOR"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.projectId)]);

export const insertProjectMemberSchema = createInsertSchema(projectMembersTable).omit({ joinedAt: true });
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
