import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, usersTable, projectMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";
import { nanoid } from "../lib/nanoid";
import { logActivity } from "./projects";

const router: IRouter = Router();

async function formatTask(task: typeof tasksTable.$inferSelect) {
  let assignedTo = null;
  if (task.assignedToId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, task.assignedToId));
    assignedTo = user ? formatUser(user) : null;
  }
  return { ...task, assignedTo };
}

router.get("/projects/:projectId/tasks", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { status } = req.query as { status?: string };

  let tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  if (status) tasks = tasks.filter(t => t.status === status);

  const result = await Promise.all(tasks.map(formatTask));
  res.json(result);
});

router.post("/projects/:projectId/tasks", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { title, description, status, assignedToId, dueDate } = req.body;

  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    id: nanoid(),
    projectId,
    title,
    description: description || null,
    status: status || "TODO",
    assignedToId: assignedToId || null,
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();

  await logActivity(projectId, user.id, "created task", `Created task "${title}"`);

  res.status(201).json(await formatTask(task));
});

router.patch("/projects/:projectId/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;

  const { title, description, status, assignedToId, dueDate } = req.body;

  const [task] = await db.update(tasksTable)
    .set({
      title, description,
      status,
      assignedToId: assignedToId !== undefined ? (assignedToId || null) : undefined,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
    })
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await logActivity(projectId, user.id, "updated task", `Updated task "${task.title}"`);

  res.json(await formatTask(task));
});

router.delete("/projects/:projectId/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;

  await db.delete(tasksTable).where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)));
  res.sendStatus(204);
});

export default router;
