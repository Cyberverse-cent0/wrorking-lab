import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, and, count, inArray, ilike, sql } from "drizzle-orm";
import { requireAuth, getCurrentUser, requireAdmin } from "../lib/auth";
import { formatUser } from "./auth";
import { hashPassword, verifyPassword } from "../lib/auth";

// Extend Request type to include file property
interface AuthenticatedRequest extends Request {
  user: any;
  file?: Express.Multer.File;
}

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

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

// Profile photo upload endpoint
router.post("/users/:userId/profile-photo", requireAuth, upload.single('image'), async (req, res): Promise<void> => {
  const requestUser = getCurrentUser(req);
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  if (requestUser.id !== userId && requestUser.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/profile-photos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Move file to permanent location
    fs.renameSync(req.file.path, filePath);

    // Update user record with image URL
    const imageUrl = `/uploads/profile-photos/${filename}`;
    const [user] = await db.update(usersTable)
      .set({ image: imageUrl, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ imageUrl });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ error: "Failed to upload profile photo" });
  }
});

// Profile photo delete endpoint
router.delete("/users/:userId/profile-photo", requireAuth, async (req, res): Promise<void> => {
  const requestUser = getCurrentUser(req);
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  if (requestUser.id !== userId && requestUser.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    // Get current user to find existing image
    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    
    if (currentUser?.image) {
      // Delete the image file
      const imagePath = path.join(__dirname, '..', currentUser.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Update user record to remove image URL
    const [user] = await db.update(usersTable)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ message: "Profile photo removed successfully" });
  } catch (error) {
    console.error('Profile photo delete error:', error);
    res.status(500).json({ error: "Failed to remove profile photo" });
  }
});

// Profile photo upload endpoint
router.post("/users/:userId/profile-photo", requireAuth, upload.single('image'), async (req, res): Promise<void> => {
  try {
    const requestUser = getCurrentUser(req);
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    // Check permissions
    if (requestUser.id !== userId && requestUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/profile-photos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Move file to permanent location
    fs.renameSync(req.file.path, filePath);

    // Update user record with image URL
    const imageUrl = `/uploads/profile-photos/${filename}`;
    
    // Use raw SQL to avoid Drizzle ORM type issues
    await db.execute(`
      UPDATE users 
      SET image = '${imageUrl}', updated_at = NOW() 
      WHERE id = '${userId}'
    `);

    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ error: error.message || "Failed to upload profile photo" });
  }
});

export default router;
