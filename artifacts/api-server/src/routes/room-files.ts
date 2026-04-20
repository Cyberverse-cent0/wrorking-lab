import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { 
  roomFiles, 
  roomMembers, 
  users,
  projectRooms
} from "@workspace/db";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";
import { eq, and, desc, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/room-files/'),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/zip', 'application/x-rar-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Upload a file to a room
router.post("/rooms/:roomId/files", requireAuth, upload.single('file'), async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;
  const { description, isPublic = false } = req.body;

  try {
    // Check if user is a room member
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a room member to upload files" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/room-files/');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const uniqueFilename = `${roomId}-${user.id}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Move file to final location
    fs.renameSync(req.file.path, filePath);

    // Create file record
    const [fileRecord] = await db.insert(roomFiles).values({
      id: nanoid(),
      roomId,
      uploadedBy: user.id,
      fileName: req.file.originalname,
      filePath,
      fileSize: req.file.size,
      fileType: fileExtension.substring(1), // Remove the dot
      mimeType: req.file.mimetype,
      description,
      isPublic: isPublic === 'true',
    }).returning();

    // Update user's last active time
    await db.update(roomMembers)
      .set({ lastActiveAt: new Date() })
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id)
      ));

    res.status(201).json(fileRecord);
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Get room files
router.get("/rooms/:roomId/files", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;
  const { 
    limit = "50", 
    offset = "0", 
    search,
    fileType,
    isPublic 
  } = req.query;

  try {
    // Check if user is a room member
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a room member to view files" });
      return;
    }

    // Build query
    let query = db.select({
      id: roomFiles.id,
      fileName: roomFiles.fileName,
      fileSize: roomFiles.fileSize,
      fileType: roomFiles.fileType,
      mimeType: roomFiles.mimeType,
      description: roomFiles.description,
      isPublic: roomFiles.isPublic,
      downloadCount: roomFiles.downloadCount,
      createdAt: roomFiles.createdAt,
      uploadedBy: roomFiles.uploadedBy,
      uploaderName: users.name,
      uploaderEmail: users.email,
      uploaderImage: users.image,
    })
      .from(roomFiles)
      .leftJoin(users, eq(roomFiles.uploadedBy, users.id))
      .where(eq(roomFiles.roomId, roomId));

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(sql`${roomFiles.fileName} ILIKE ${`%${search}%`} OR ${roomFiles.description} ILIKE ${`%${search}%`}`);
    }
    
    if (fileType) {
      conditions.push(eq(roomFiles.fileType, fileType as string));
    }
    
    if (isPublic !== undefined) {
      conditions.push(eq(roomFiles.isPublic, isPublic === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering and pagination
    query = query.orderBy(desc(roomFiles.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const files = await query;

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// Download a file
router.get("/rooms/:roomId/files/:fileId/download", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId, fileId } = req.params;

  try {
    // Check if user is a room member
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a room member to download files" });
      return;
    }

    // Get file record
    const [fileRecord] = await db.select()
      .from(roomFiles)
      .where(and(
        eq(roomFiles.id, fileId),
        eq(roomFiles.roomId, roomId)
      ));

    if (!fileRecord) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check if file exists
    if (!fs.existsSync(fileRecord.filePath)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }

    // Increment download count
    await db.update(roomFiles)
      .set({ downloadCount: sql`${roomFiles.downloadCount} + 1` })
      .where(eq(roomFiles.id, fileId));

    // Send file
    res.download(fileRecord.filePath, fileRecord.fileName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Delete a file
router.delete("/rooms/:roomId/files/:fileId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId, fileId } = req.params;

  try {
    // Get file and check permissions
    const [fileRecord] = await db.select()
      .from(roomFiles)
      .where(and(
        eq(roomFiles.id, fileId),
        eq(roomFiles.roomId, roomId)
      ));

    if (!fileRecord) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check if user is uploader or room admin
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    const canDelete = fileRecord.uploadedBy === user.id || 
      (membership && ["admin", "moderator"].includes(membership.role));

    if (!canDelete) {
      res.status(403).json({ error: "You can only delete your own files or be an admin/moderator" });
      return;
    }

    // Delete file from database
    await db.delete(roomFiles)
      .where(eq(roomFiles.id, fileId));

    // Delete file from disk
    if (fs.existsSync(fileRecord.filePath)) {
      fs.unlinkSync(fileRecord.filePath);
    }

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Update file metadata
router.put("/rooms/:roomId/files/:fileId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId, fileId } = req.params;
  const { description, isPublic } = req.body;

  try {
    // Get file and check permissions
    const [fileRecord] = await db.select()
      .from(roomFiles)
      .where(and(
        eq(roomFiles.id, fileId),
        eq(roomFiles.roomId, roomId)
      ));

    if (!fileRecord) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check if user is uploader or room admin
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    const canUpdate = fileRecord.uploadedBy === user.id || 
      (membership && ["admin", "moderator"].includes(membership.role));

    if (!canUpdate) {
      res.status(403).json({ error: "You can only update your own files or be an admin/moderator" });
      return;
    }

    // Update file
    const [updatedFile] = await db.update(roomFiles)
      .set({
        description,
        isPublic: isPublic !== undefined ? isPublic : fileRecord.isPublic,
      })
      .where(eq(roomFiles.id, fileId))
      .returning();

    res.json(updatedFile);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: "Failed to update file" });
  }
});

export default router;
