import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";
import { logActivity } from "./projects";

const router: IRouter = Router();

router.get("/projects/:projectId/members", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const members = await db.select().from(projectMembersTable).where(eq(projectMembersTable.projectId, projectId));

  const result = await Promise.all(members.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId));
    return { ...m, user: user ? formatUser(user) : null };
  }));

  res.json(result);
});

router.patch("/projects/:projectId/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

  const [requesterMembership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, user.id)));

  if ((!requesterMembership || !["LEAD", "CO_LEAD"].includes(requesterMembership.role)) && user.role !== "ADMIN") {
    res.status(403).json({ error: "Only leads can change member roles" });
    return;
  }

  const { role } = req.body;
  const [member] = await db.update(projectMembersTable)
    .set({ role })
    .where(eq(projectMembersTable.id, memberId))
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [memberUser] = await db.select().from(usersTable).where(eq(usersTable.id, member.userId));
  await logActivity(projectId, user.id, "updated member role", `Changed ${memberUser?.name}'s role to ${role}`);

  res.json({ ...member, user: memberUser ? formatUser(memberUser) : null });
});

router.delete("/projects/:projectId/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

  const [requesterMembership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, user.id)));

  const [targetMember] = await db.select().from(projectMembersTable).where(eq(projectMembersTable.id, memberId));

  if (!targetMember) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  // Can remove self, or lead/admin can remove others
  const isSelf = targetMember.userId === user.id;
  const isLeadOrAdmin = (requesterMembership && ["LEAD", "CO_LEAD"].includes(requesterMembership.role)) || user.role === "ADMIN";

  if (!isSelf && !isLeadOrAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(projectMembersTable).where(eq(projectMembersTable.id, memberId));
  await logActivity(projectId, user.id, "removed member", `Removed member from project`);

  res.sendStatus(204);
});

export default router;
