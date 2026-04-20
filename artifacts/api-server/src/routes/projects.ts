import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";

const router: IRouter = Router();

async function logActivity(projectId: string, userId: string, action: string, details?: string) {
  try {
    await db.execute(`
      INSERT INTO activity_logs (id, project_id, user_id, action, details, created_at)
      VALUES ('${nanoid()}', '${projectId}', '${userId}', '${action}', ${details ? `'${details}'` : 'NULL'}, NOW())
    `);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Get most popular projects
router.get("/projects/popular", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  
  try {
    // Use raw SQL to avoid Drizzle ORM type issues
    const popularProjects = await db.execute(`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.status,
        p.visibility,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        COUNT(pm.user_id) as "memberCount"
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.visibility = 'PUBLIC'
      GROUP BY p.id, p.title, p.description, p.status, p.visibility, p.created_at, p.updated_at
      ORDER BY COUNT(pm.user_id) DESC
      LIMIT 10
    `);

    res.json(popularProjects);
  } catch (error) {
    console.error('Error fetching popular projects:', error);
    res.status(500).json({ error: "Failed to fetch popular projects" });
  }
});

export { logActivity };
export default router;
