import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  projectsTable,
  projectMembersTable,
  tasksTable,
  milestonesTable,
  projectFilesTable,
  chatMessagesTable,
  activityLogsTable,
  invitationsTable,
} from "@workspace/db";
import { eq, and, count, gte, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/analytics/platform", requireAdmin, async (_req, res): Promise<void> => {
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);
  const [{ totalProjects }] = await db.select({ totalProjects: count() }).from(projectsTable);
  const [{ totalMessages }] = await db.select({ totalMessages: count() }).from(chatMessagesTable);
  const [{ totalFiles }] = await db.select({ totalFiles: count() }).from(projectFilesTable);

  const projects = await db.select().from(projectsTable);
  const activeProjects = projects.filter(p => p.status === "ONGOING").length;
  const completedProjects = projects.filter(p => p.status === "COMPLETED").length;
  const draftProjects = projects.filter(p => p.status === "DRAFT").length;
  const publicProjects = projects.filter(p => p.visibility === "PUBLIC").length;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentUsers = await db.select().from(usersTable);
  const recentSignups = recentUsers.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length;

  res.json({
    totalUsers: Number(totalUsers),
    totalProjects: Number(totalProjects),
    activeProjects,
    completedProjects,
    draftProjects,
    publicProjects,
    totalMessages: Number(totalMessages),
    totalFiles: Number(totalFiles),
    recentSignups,
  });
});

router.get("/analytics/dashboard", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);

  const memberships = await db.select().from(projectMembersTable).where(eq(projectMembersTable.userId, user.id));
  const myProjectCount = memberships.filter(m => m.role === "LEAD").length;
  const collaboratingCount = memberships.filter(m => m.role !== "LEAD").length;

  const [{ pendingInvitations }] = await db.select({ pendingInvitations: count() }).from(invitationsTable)
    .where(and(eq(invitationsTable.email, user.email), eq(invitationsTable.status, "PENDING")));

  const projectIds = memberships.map(m => m.projectId);
  const recentProjects = projectIds.length > 0
    ? await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt)).limit(5)
    : [];

  const filteredRecentProjects = recentProjects.filter(p => projectIds.includes(p.id));

  const recentProjectsWithStats = await Promise.all(filteredRecentProjects.map(async (p) => {
    const [{ mc }] = await db.select({ mc: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, p.id));
    const [{ tc }] = await db.select({ tc: count() }).from(tasksTable).where(eq(tasksTable.projectId, p.id));
    const membership = memberships.find(m => m.projectId === p.id);
    return {
      ...p,
      memberCount: Number(mc),
      taskCount: Number(tc),
      currentUserRole: membership?.role ?? null,
    };
  }));

  // Recent activity across user's projects
  const recentActivity = projectIds.length > 0
    ? await db.select().from(activityLogsTable)
        .orderBy(desc(activityLogsTable.createdAt))
        .limit(10)
    : [];

  const filteredActivity = recentActivity.filter(a => projectIds.includes(a.projectId));

  const activityWithUsers = await Promise.all(filteredActivity.slice(0, 10).map(async (a) => {
    const [actUser] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId));
    return { ...a, user: actUser ? formatUser(actUser) : null };
  }));

  res.json({
    myProjectCount,
    collaboratingCount,
    pendingInvitations: Number(pendingInvitations),
    recentProjects: recentProjectsWithStats,
    recentActivity: activityWithUsers,
  });
});

router.get("/analytics/projects/:projectId/stats", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.projectId, projectId));
  const [{ memberCount }] = await db.select({ memberCount: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, projectId));
  const [{ fileCount }] = await db.select({ fileCount: count() }).from(projectFilesTable).where(eq(projectFilesTable.projectId, projectId));
  const [{ messageCount }] = await db.select({ messageCount: count() }).from(chatMessagesTable).where(eq(chatMessagesTable.projectId, projectId));

  res.json({
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === "DONE").length,
    inProgressTasks: tasks.filter(t => t.status === "IN_PROGRESS").length,
    todoTasks: tasks.filter(t => t.status === "TODO").length,
    totalMilestones: milestones.length,
    completedMilestones: milestones.filter(m => m.completed).length,
    memberCount: Number(memberCount),
    fileCount: Number(fileCount),
    messageCount: Number(messageCount),
  });
});

// Overview stats for user dashboard
router.get("/analytics/overview", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);

  const memberships = await db.select().from(projectMembersTable).where(eq(projectMembersTable.userId, user.id));
  const projectIds = memberships.map(m => m.projectId);

  const projects = projectIds.length > 0
    ? await db.select().from(projectsTable)
    : [];

  const myProjects = user.role === "ADMIN"
    ? await db.select().from(projectsTable)
    : projects.filter(p => projectIds.includes(p.id));

  const activeProjects = myProjects.filter(p => p.status === "ACTIVE" || p.status === "ONGOING").length;

  // Count all members across my projects
  const allMemberships = myProjects.length > 0
    ? await db.select().from(projectMembersTable)
    : [];
  const totalMembers = new Set(allMemberships.map(m => m.userId)).size;

  // Tasks
  const allTasks = myProjects.length > 0
    ? await db.select().from(tasksTable)
    : [];
  const myTasks = allTasks.filter(t => projectIds.includes(t.projectId));
  const completedTasks = myTasks.filter(t => t.status === "DONE").length;

  // Milestones upcoming
  const allMilestones = myProjects.length > 0
    ? await db.select().from(milestonesTable)
    : [];
  const upcomingMilestones = allMilestones.filter(m =>
    projectIds.includes(m.projectId) && !m.completedAt && m.dueDate && new Date(m.dueDate) > new Date()
  ).length;

  res.json({
    totalProjects: myProjects.length,
    activeProjects,
    totalMembers,
    totalTasks: myTasks.length,
    completedTasks,
    upcomingMilestones,
  });
});

// Admin overview stats
router.get("/analytics/admin", requireAdmin, async (_req, res): Promise<void> => {
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);
  const [{ totalProjects }] = await db.select({ totalProjects: count() }).from(projectsTable);
  const [{ totalTasks }] = await db.select({ totalTasks: count() }).from(tasksTable);

  const projects = await db.select().from(projectsTable);
  const activeProjects = projects.filter(p => p.status === "ACTIVE" || p.status === "ONGOING").length;

  // Group by status
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }
  const projectsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Group by month (last 6)
  const monthCounts: Record<string, number> = {};
  for (const p of projects) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  }
  const projectsByMonth = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month: month.substring(5), count }));

  res.json({
    totalUsers: Number(totalUsers),
    totalProjects: Number(totalProjects),
    totalTasks: Number(totalTasks),
    activeProjects,
    projectsByStatus,
    projectsByMonth,
  });
});

export default router;
