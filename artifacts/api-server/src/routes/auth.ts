import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { nanoid } from "../lib/nanoid";
import { hashPassword, verifyPassword, generateToken, requireAuth, getCurrentUser } from "../lib/auth";

const router: IRouter = Router();

const formatUser = (user: typeof usersTable.$inferSelect) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  institution: user.institution,
  researchInterests: user.researchInterests,
  bio: user.bio,
  image: user.image,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { name, email, password, institution, researchInterests } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  // First user becomes ADMIN
  const [{ userCount }] = await db.select({ userCount: count() }).from(usersTable);
  const role = userCount === 0 ? "ADMIN" : "USER";

  const passwordHash = hashPassword(password);
  const id = nanoid();

  const [user] = await db.insert(usersTable).values({
    id,
    name,
    email,
    passwordHash,
    institution: institution || null,
    researchInterests: researchInterests || null,
    role,
  }).returning();

  const token = generateToken(user.id);
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/signin", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken(user.id);
  res.json({ token, user: formatUser(user) });
});

router.post("/auth/signout", async (_req, res): Promise<void> => {
  res.json({ message: "Signed out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  res.json(formatUser(user));
});

export { formatUser };
export default router;
