import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin, getCurrentUser } from "../lib/auth";
import { formatUser } from "./auth";
import { hashPassword, verifyPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { search, role } = req.query as { search?: string; role?: string };

  let users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  if (search) {
    users = users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (role) {
    users = users.filter(u => u.role === role);
  }

  res.json(users.map(formatUser));
});

router.get("/users/change-password", requireAuth, async (_req, res): Promise<void> => {
  res.json({ message: "Use POST" });
});

router.post("/users/change-password", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }

  if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  res.json({ message: "Password changed successfully" });
});

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.patch("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const requestUser = getCurrentUser(req);
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  if (requestUser.id !== userId && requestUser.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, institution, researchInterests, bio, image } = req.body;

  const [user] = await db.update(usersTable)
    .set({ name, institution, researchInterests, bio, image, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.delete("/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.sendStatus(204);
});

router.patch("/users/:userId/role", requireAdmin, async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const { role } = req.body;

  if (!["USER", "ADMIN"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
