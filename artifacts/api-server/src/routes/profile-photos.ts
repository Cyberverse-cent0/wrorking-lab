import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { requireAuth, getCurrentUser } from "../lib/auth";

const router: IRouter = Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload profile photo
router.post("/users/:userId/profile-photo", upload.single('image'), async (req, res): Promise<void> => {
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

// Delete profile photo
router.delete("/users/:userId/profile-photo", requireAuth, async (req, res): Promise<void> => {
  try {
    const requestUser = getCurrentUser(req);
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    // Check permissions
    if (requestUser.id !== userId && requestUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Get current user to find existing image
    const result = await db.execute(`
      SELECT image FROM users WHERE id = '${userId}'
    `);
    
    const currentUser = (result as unknown as any[])[0];
    
    if (currentUser?.image) {
      // Delete the image file
      const imagePath = path.join(__dirname, '..', currentUser.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Update user record to remove image URL
    await db.execute(`
      UPDATE users 
      SET image = NULL, updated_at = NOW() 
      WHERE id = '${userId}'
    `);

    res.json({ message: "Profile photo removed successfully" });
  } catch (error: any) {
    console.error('Profile photo delete error:', error);
    res.status(500).json({ error: error.message || "Failed to remove profile photo" });
  }
});

export default router;
