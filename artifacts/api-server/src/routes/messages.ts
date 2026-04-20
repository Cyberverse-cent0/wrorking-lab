import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable } from "@workspace/db";
import { eq, lt, desc } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";
import { nanoid } from "../lib/nanoid";

const router: IRouter = Router();

router.get("/projects/:projectId/messages", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { limit, before } = req.query as { limit?: string; before?: string };

  const limitNum = limit ? parseInt(limit, 10) : 50;

  let query = db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.projectId, projectId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(limitNum);

  const messages = await query;

  const result = await Promise.all(messages.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId));
    return { ...m, user: user ? formatUser(user) : null };
  }));

  res.json(result);
});

router.post("/projects/:projectId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const [msg] = await db.insert(chatMessagesTable).values({
    id: nanoid(),
    projectId,
    userId: user.id,
    message,
  }).returning();

  res.status(201).json({ ...msg, user: formatUser(user) });
});

export default router;
