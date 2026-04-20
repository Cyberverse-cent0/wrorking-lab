import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectFilesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";
import { nanoid } from "../lib/nanoid";
import { logActivity } from "./projects";

const router: IRouter = Router();

router.get("/projects/:projectId/files", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const files = await db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, projectId));

  const result = await Promise.all(files.map(async (f) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, f.uploadedById));
    return { ...f, uploadedBy: user ? formatUser(user) : null };
  }));

  res.json(result);
});

router.post("/projects/:projectId/files", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { filename, fileUrl } = req.body;

  if (!filename || !fileUrl) {
    res.status(400).json({ error: "Filename and file URL are required" });
    return;
  }

  const [file] = await db.insert(projectFilesTable).values({
    id: nanoid(),
    projectId,
    filename,
    fileUrl,
    uploadedById: user.id,
  }).returning();

  await logActivity(projectId, user.id, "uploaded file", `Uploaded file "${filename}"`);

  res.status(201).json({ ...file, uploadedBy: formatUser(user) });
});

router.delete("/projects/:projectId/files/:fileId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

  await db.delete(projectFilesTable).where(and(eq(projectFilesTable.id, fileId), eq(projectFilesTable.projectId, projectId)));
  res.sendStatus(204);
});

export default router;
