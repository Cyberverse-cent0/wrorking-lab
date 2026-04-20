import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { invitationStatusEnum } from "./projects";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invitationsTable = pgTable("invitations", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  projectId: text("project_id").notNull(),
  invitedById: text("invited_by_id").notNull(),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitationsTable).omit({ createdAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitationsTable.$inferSelect;
