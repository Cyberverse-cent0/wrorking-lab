import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, projectsTable, projectMembersTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json({ users: users.map(formatUser) });
});

router.patch("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const userId = req.params.userId as string;
  const { role } = req.body;

  const [user] = await db.update(usersTable).set({ role, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.delete("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const userId = req.params.userId as string;
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.sendStatus(204);
});

router.get("/admin/projects", requireAdmin, async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
  const result = await Promise.all(projects.map(async (p) => {
    const [{ mc }] = await db.select({ mc: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, p.id));
    const leadMembership = await db.select().from(projectMembersTable).where(eq(projectMembersTable.projectId, p.id));
    const leadId = leadMembership.find(m => m.role === "LEAD")?.userId;
    let owner = null;
    if (leadId) {
      const [ownerUser] = await db.select().from(usersTable).where(eq(usersTable.id, leadId));
      owner = ownerUser ? { name: ownerUser.name } : null;
    }
    return { ...p, memberCount: Number(mc), owner };
  }));
  res.json({ projects: result });
});

router.delete("/admin/projects/:projectId", requireAdmin, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.sendStatus(204);
});

export default router;
