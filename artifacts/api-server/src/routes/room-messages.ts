import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { 
  roomMessages, 
  roomMembers, 
  users,
  projectRooms
} from "@workspace/db";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";
import { eq, and, desc, asc, or, sql } from "drizzle-orm";

const router: IRouter = Router();

// Send a message to a room
router.post("/rooms/:roomId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;
  const { content, messageType = "text", replyTo } = req.body;

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
      res.status(403).json({ error: "You must be a room member to send messages" });
      return;
    }

    // Validate content
    if (!content || content.trim() === "") {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    // Check if replyTo exists and is in the same room
    if (replyTo) {
      const [replyMessage] = await db.select()
        .from(roomMessages)
        .where(and(
          eq(roomMessages.id, replyTo),
          eq(roomMessages.roomId, roomId)
        ));

      if (!replyMessage) {
        res.status(400).json({ error: "Invalid reply message" });
        return;
      }
    }

    // Create message
    const [message] = await db.insert(roomMessages).values({
      id: nanoid(),
      roomId,
      senderId: user.id,
      content: content.trim(),
      messageType,
      replyTo,
    }).returning();

    // Update user's last active time
    await db.update(roomMembers)
      .set({ lastActiveAt: new Date() })
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id)
      ));

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get room messages
router.get("/rooms/:roomId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;
  const { 
    limit = "50", 
    offset = "0", 
    before,
    after,
    search 
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
      res.status(403).json({ error: "You must be a room member to view messages" });
      return;
    }

    // Build query
    let query = db.select({
      id: roomMessages.id,
      content: roomMessages.content,
      messageType: roomMessages.messageType,
      fileUrl: roomMessages.fileUrl,
      fileName: roomMessages.fileName,
      fileSize: roomMessages.fileSize,
      replyTo: roomMessages.replyTo,
      isPinned: roomMessages.isPinned,
      createdAt: roomMessages.createdAt,
      updatedAt: roomMessages.updatedAt,
      senderId: roomMessages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      senderImage: users.image,
    })
      .from(roomMessages)
      .leftJoin(users, eq(roomMessages.senderId, users.id))
      .where(eq(roomMessages.roomId, roomId));

    // Apply filters
    const conditions = [];
    
    if (before) {
      conditions.push(sql`${roomMessages.createdAt} < ${new Date(before as string)}`);
    }
    
    if (after) {
      conditions.push(sql`${roomMessages.createdAt} > ${new Date(after as string)}`);
    }
    
    if (search) {
      conditions.push(sql`${roomMessages.content} ILIKE ${`%${search}%`}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering and pagination
    query = query.orderBy(desc(roomMessages.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const messages = await query;

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get message replies
router.get("/rooms/:roomId/messages/:messageId/replies", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId, messageId } = req.params;

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
      res.status(403).json({ error: "You must be a room member to view replies" });
      return;
    }

    const replies = await db.select({
      id: roomMessages.id,
      content: roomMessages.content,
      messageType: roomMessages.messageType,
      fileUrl: roomMessages.fileUrl,
      fileName: roomMessages.fileName,
      fileSize: roomMessages.fileSize,
      createdAt: roomMessages.createdAt,
      senderId: roomMessages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      senderImage: users.image,
    })
      .from(roomMessages)
      .leftJoin(users, eq(roomMessages.senderId, users.id))
      .where(and(
        eq(roomMessages.roomId, roomId),
        eq(roomMessages.replyTo, messageId)
      ))
      .orderBy(asc(roomMessages.createdAt));

    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: "Failed to fetch replies" });
  }
});

// Pin/unpin a message
router.put("/rooms/:roomId/messages/:messageId/pin", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId, messageId } = req.params;
  const { isPinned } = req.body;

  try {
    // Check if user is a room admin or moderator
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      res.status(403).json({ error: "You must be an admin or moderator to pin messages" });
      return;
    }

    // Update message
    const [message] = await db.update(roomMessages)
      .set({ isPinned })
      .where(and(
        eq(roomMessages.id, messageId),
        eq(roomMessages.roomId, roomId)
      ))
      .returning();

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.json(message);
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({ error: "Failed to pin message" });
  }
});

// Delete a message
router.delete("/rooms/:roomId/messages/:messageId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId, messageId } = req.params;

  try {
    // Get message and check permissions
    const [message] = await db.select()
      .from(roomMessages)
      .where(and(
        eq(roomMessages.id, messageId),
        eq(roomMessages.roomId, roomId)
      ));

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Check if user is sender or room admin/moderator
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id),
        eq(roomMembers.isActive, true)
      ));

    const canDelete = message.senderId === user.id || 
      (membership && ["admin", "moderator"].includes(membership.role));

    if (!canDelete) {
      res.status(403).json({ error: "You can only delete your own messages or be an admin/moderator" });
      return;
    }

    // Delete message
    await db.delete(roomMessages)
      .where(eq(roomMessages.id, messageId));

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// Get pinned messages
router.get("/rooms/:roomId/messages/pinned", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;

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
      res.status(403).json({ error: "You must be a room member to view pinned messages" });
      return;
    }

    const pinnedMessages = await db.select({
      id: roomMessages.id,
      content: roomMessages.content,
      messageType: roomMessages.messageType,
      fileUrl: roomMessages.fileUrl,
      fileName: roomMessages.fileName,
      fileSize: roomMessages.fileSize,
      createdAt: roomMessages.createdAt,
      senderId: roomMessages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      senderImage: users.image,
    })
      .from(roomMessages)
      .leftJoin(users, eq(roomMessages.senderId, users.id))
      .where(and(
        eq(roomMessages.roomId, roomId),
        eq(roomMessages.isPinned, true)
      ))
      .orderBy(asc(roomMessages.createdAt));

    res.json(pinnedMessages);
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    res.status(500).json({ error: "Failed to fetch pinned messages" });
  }
});

export default router;
