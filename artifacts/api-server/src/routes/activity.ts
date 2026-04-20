import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activityLogsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/projects/:projectId/activity", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { limit } = req.query as { limit?: string };
  const limitNum = limit ? parseInt(limit, 10) : 50;

  const logs = await db.select().from(activityLogsTable)
    .where(eq(activityLogsTable.projectId, projectId))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limitNum);

  const result = await Promise.all(logs.map(async (l) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, l.userId));
    return { ...l, user: user ? formatUser(user) : null };
  }));

  res.json(result);
});

export default router;
