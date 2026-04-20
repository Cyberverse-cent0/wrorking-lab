import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  projectMembersTable,
  tasksTable,
  activityLogsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, or, count, inArray, ilike, sql } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";
import { formatUser } from "./auth";

const router: IRouter = Router();

async function logActivity(projectId: string, userId: string, action: string, details?: string) {
  await db.insert(activityLogsTable).values({
    id: nanoid(),
    projectId,
    userId,
    action,
    details,
  });
}

async function getProjectWithUserRole(projectId: string, userId?: string) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return null;

  const [{ mc }] = await db.select({ mc: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, projectId));

  let currentUserRole: string | null = null;
  if (userId) {
    const [membership] = await db.select().from(projectMembersTable)
      .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)));
    currentUserRole = membership?.role ?? null;
  }

  return {
    ...project,
    memberCount: Number(mc),
    currentUserRole,
  };
}

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { 
    visibility, 
    status, 
    search, 
    myProjects, 
    sortBy = "updatedAt", 
    sortOrder = "desc",
    keywords,
    limit
  } = req.query as {
    visibility?: string;
    status?: string;
    search?: string;
    myProjects?: string;
    sortBy?: string;
    sortOrder?: string;
    keywords?: string;
    limit?: string;
  };

  // Build base query
  let query = db.select().from(projectsTable);
  
  // Apply visibility and membership filters
  if (myProjects === "true") {
    const memberships = await db.select().from(projectMembersTable).where(eq(projectMembersTable.userId, user.id));
    const projectIds = memberships.map(m => m.projectId);
    query = query.where(inArray(projectsTable.id, projectIds));
  } else {
    // Public or member's projects
    const memberships = await db.select().from(projectMembersTable).where(eq(projectMembersTable.userId, user.id));
    const memberProjectIds = memberships.map(m => m.projectId);
    query = query.where(
      or(
        eq(projectsTable.visibility, "PUBLIC"),
        inArray(projectsTable.id, memberProjectIds)
      )
    );
  }

  // Apply additional filters
  const conditions = [];
  if (visibility && visibility !== "all") {
    conditions.push(eq(projectsTable.visibility, visibility));
  }
  if (status && status !== "all") {
    conditions.push(eq(projectsTable.status, status));
  }
  if (search) {
    conditions.push(
      or(
        ilike(projectsTable.title, `%${search}%`),
        ilike(projectsTable.description, `%${search}%`),
        ilike(projectsTable.abstract, `%${search}%`),
        sql`${projectsTable.keywords}::text ILIKE ${`%${search}%`}`
      )
    );
  }
  if (keywords) {
    const keywordList = keywords.split(",").map(k => k.trim()).filter(k => k);
    if (keywordList.length > 0) {
      conditions.push(
        sql`${projectsTable.keywords}::text ILIKE ANY(${keywordList.map(k => `%${k}%`)})`
      );
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Apply sorting
  let orderField = projectsTable.updatedAt;
  if (sortBy === "createdAt") orderField = projectsTable.createdAt;
  else if (sortBy === "title") orderField = projectsTable.title;
  else if (sortBy === "memberCount") {
    // For member count sorting, we'll need to join and count
    const projects = await query.leftJoin(projectMembersTable, eq(projectsTable.id, projectMembersTable.projectId))
      .groupBy(projectsTable.id)
      .orderBy(sql`count(${projectMembersTable.userId}) ${sql.raw(sortOrder.toUpperCase())}`)
      .limit(limit ? parseInt(limit) : 100);
    
    const memberships = await db.select().from(projectMembersTable).where(eq(projectMembersTable.userId, user.id));
    const memberProjectIds = new Map(memberships.map(m => [m.projectId, m.role]));

    const results = await Promise.all(projects.map(async (p) => {
      const project = p.projects;
      const [{ mc }] = await db.select({ mc: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, project.id));
      const [{ tc }] = await db.select({ tc: count() }).from(tasksTable).where(eq(tasksTable.projectId, project.id));
      return {
        ...project,
        memberCount: Number(mc),
        taskCount: Number(tc),
        currentUserRole: memberProjectIds.get(project.id) ?? null,
      };
    }));

    res.json(results);
    return;
  }

  // Apply regular sorting
  query = query.orderBy(sql`${orderField} ${sql.raw(sortOrder.toUpperCase())}`);
  
  // Apply limit
  if (limit) {
    query = query.limit(parseInt(limit));
  }

  const projects = await query.limit(100);

  const memberships = await db.select().from(projectMembersTable).where(eq(projectMembersTable.userId, user.id));
  const memberProjectIds = new Map(memberships.map(m => [m.projectId, m.role]));

  const results = await Promise.all(projects.map(async (p) => {
    const [{ mc }] = await db.select({ mc: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, p.id));
    const [{ tc }] = await db.select({ tc: count() }).from(tasksTable).where(eq(tasksTable.projectId, p.id));
    return {
      ...p,
      memberCount: Number(mc),
      taskCount: Number(tc),
      currentUserRole: memberProjectIds.get(p.id) ?? null,
    };
  }));

  res.json(results);
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { title, description, abstract, keywords, status, visibility, startDate, endDate } = req.body;

  // Check if user has permission to create projects (ADMIN only)
  if (user.role !== "ADMIN") {
    res.status(403).json({ error: "Only administrators can create projects" });
    return;
  }

  if (!title || !description) {
    res.status(400).json({ error: "Title and description are required" });
    return;
  }

  const id = nanoid();
  const [project] = await db.insert(projectsTable).values({
    id,
    title,
    description,
    abstract: abstract || null,
    keywords: keywords || [],
    status: status || "DRAFT",
    visibility: visibility || "PRIVATE",
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }).returning();

  // Creator becomes LEAD
  await db.insert(projectMembersTable).values({
    id: nanoid(),
    userId: user.id,
    projectId: project.id,
    role: "LEAD",
  });

  await logActivity(project.id, user.id, "created project", `Created project "${title}"`);

  res.status(201).json({ ...project, memberCount: 1, currentUserRole: "LEAD" });
});

router.get("/projects/:projectId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const result = await getProjectWithUserRole(projectId, user.id);
  if (!result) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Check access: PUBLIC or member or admin
  if (result.visibility !== "PUBLIC" && !result.currentUserRole && user.role !== "ADMIN") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(result);
});

router.patch("/projects/:projectId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const [membership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, user.id)));

  if (!membership && user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (membership && !["LEAD", "CO_LEAD"].includes(membership.role) && user.role !== "ADMIN") {
    res.status(403).json({ error: "Only leads can edit projects" });
    return;
  }

  const { title, description, abstract, keywords, status, visibility, startDate, endDate } = req.body;

  const [project] = await db.update(projectsTable)
    .set({
      title, description, abstract, keywords,
      status, visibility,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, projectId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(projectId, user.id, "updated project", `Updated project details`);

  const result = await getProjectWithUserRole(projectId, user.id);
  res.json(result);
});

router.delete("/projects/:projectId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const [membership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, user.id)));

  if ((!membership || membership.role !== "LEAD") && user.role !== "ADMIN") {
    res.status(403).json({ error: "Only the project lead can delete the project" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.sendStatus(204);
});

export { logActivity };
export default router;
