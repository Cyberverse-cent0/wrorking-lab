import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectFilesTable = pgTable("project_files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedById: text("uploaded_by_id").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectFileSchema = createInsertSchema(projectFilesTable).omit({ uploadedAt: true });
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFilesTable.$inferSelect;
