import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { invitationsTable, projectsTable, usersTable, projectMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";
import { nanoid } from "../lib/nanoid";
import { logActivity } from "./projects";

const router: IRouter = Router();

async function formatInvitation(inv: typeof invitationsTable.$inferSelect) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, inv.projectId));
  const [invitedBy] = await db.select().from(usersTable).where(eq(usersTable.id, inv.invitedById));
  return {
    ...inv,
    project: project ? { id: project.id, title: project.title, description: project.description, keywords: project.keywords, status: project.status, visibility: project.visibility, memberCount: 0, taskCount: 0, createdAt: project.createdAt, updatedAt: project.updatedAt, currentUserRole: null } : null,
    invitedBy: invitedBy ? formatUser(invitedBy) : null,
  };
}

router.post("/projects/:projectId/invitations", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [membership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, user.id)));

  if ((!membership || !["LEAD", "CO_LEAD"].includes(membership.role)) && user.role !== "ADMIN") {
    res.status(403).json({ error: "Only leads can invite collaborators" });
    return;
  }

  // Check if already a member
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingUser) {
    const [existingMember] = await db.select().from(projectMembersTable)
      .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, existingUser.id)));
    if (existingMember) {
      res.status(400).json({ error: "User is already a member of this project" });
      return;
    }
  }

  // Check for existing pending invitation
  const [existingInv] = await db.select().from(invitationsTable)
    .where(and(eq(invitationsTable.projectId, projectId), eq(invitationsTable.email, email), eq(invitationsTable.status, "PENDING")));
  if (existingInv) {
    res.status(400).json({ error: "Invitation already sent to this email" });
    return;
  }

  const [inv] = await db.insert(invitationsTable).values({
    id: nanoid(),
    email,
    projectId,
    invitedById: user.id,
    status: "PENDING",
  }).returning();

  await logActivity(projectId, user.id, "invited collaborator", `Invited ${email} to collaborate`);

  res.status(201).json(await formatInvitation(inv));
});

router.get("/projects/:projectId/invitations", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const invitations = await db.select().from(invitationsTable).where(eq(invitationsTable.projectId, projectId));
  const result = await Promise.all(invitations.map(formatInvitation));
  res.json(result);
});

router.post("/invitations/:invitationId/accept", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const invitationId = Array.isArray(req.params.invitationId) ? req.params.invitationId[0] : req.params.invitationId;

  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.id, invitationId));
  if (!inv) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }

  if (inv.email !== user.email && user.role !== "ADMIN") {
    res.status(403).json({ error: "This invitation is not for you" });
    return;
  }

  if (inv.status !== "PENDING") {
    res.status(400).json({ error: "Invitation is no longer pending" });
    return;
  }

  await db.update(invitationsTable).set({ status: "ACCEPTED" }).where(eq(invitationsTable.id, invitationId));

  // Add as member
  const [existing] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, inv.projectId), eq(projectMembersTable.userId, user.id)));

  if (!existing) {
    await db.insert(projectMembersTable).values({
      id: nanoid(),
      userId: user.id,
      projectId: inv.projectId,
      role: "CONTRIBUTOR",
    });
    await logActivity(inv.projectId, user.id, "accepted invitation", `${user.name} joined the project`);
  }

  res.json({ message: "Invitation accepted successfully" });
});

router.post("/invitations/:invitationId/decline", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const invitationId = Array.isArray(req.params.invitationId) ? req.params.invitationId[0] : req.params.invitationId;

  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.id, invitationId));
  if (!inv || (inv.email !== user.email && user.role !== "ADMIN")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.update(invitationsTable).set({ status: "DECLINED" }).where(eq(invitationsTable.id, invitationId));
  res.json({ message: "Invitation declined" });
});

router.get("/invitations/my", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const invitations = await db.select().from(invitationsTable)
    .where(and(eq(invitationsTable.email, user.email), eq(invitationsTable.status, "PENDING")));
  const result = await Promise.all(invitations.map(formatInvitation));
  res.json(result);
});

export default router;
