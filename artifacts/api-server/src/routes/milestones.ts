import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { milestonesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";
import { logActivity } from "./projects";

const router: IRouter = Router();

router.get("/projects/:projectId/milestones", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.projectId, projectId));
  res.json(milestones);
});

router.post("/projects/:projectId/milestones", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { title, dueDate } = req.body;

  if (!title || !dueDate) {
    res.status(400).json({ error: "Title and due date are required" });
    return;
  }

  const [milestone] = await db.insert(milestonesTable).values({
    id: nanoid(),
    projectId,
    title,
    dueDate: new Date(dueDate),
    completed: false,
  }).returning();

  await logActivity(projectId, user.id, "created milestone", `Created milestone "${title}"`);

  res.status(201).json(milestone);
});

router.patch("/projects/:projectId/milestones/:milestoneId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const milestoneId = Array.isArray(req.params.milestoneId) ? req.params.milestoneId[0] : req.params.milestoneId;
  const { title, dueDate, completed } = req.body;

  const [milestone] = await db.update(milestonesTable)
    .set({
      title,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completed,
    })
    .where(and(eq(milestonesTable.id, milestoneId), eq(milestonesTable.projectId, projectId)))
    .returning();

  if (!milestone) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }

  if (completed) {
    await logActivity(projectId, user.id, "completed milestone", `Completed milestone "${milestone.title}"`);
  }

  res.json(milestone);
});

router.delete("/projects/:projectId/milestones/:milestoneId", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const milestoneId = Array.isArray(req.params.milestoneId) ? req.params.milestoneId[0] : req.params.milestoneId;
  await db.delete(milestonesTable).where(and(eq(milestonesTable.id, milestoneId), eq(milestonesTable.projectId, projectId)));
  res.sendStatus(204);
});

export default router;
