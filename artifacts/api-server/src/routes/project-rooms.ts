import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { 
  projectRooms, 
  roomMessages, 
  roomFiles, 
  roomMembers, 
  roomActivityLogs,
  projectBlogPosts,
  blogPostComments,
  blogPostLikes,
  users,
  projects,
  projectMembersTable
} from "@workspace/db";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

const router: IRouter = Router();

// Create a project room
router.post("/projects/:projectId/rooms", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId } = req.params;
  const { name, description } = req.body;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to create a room" });
      return;
    }

    // Create the room
    const roomId = nanoid();
    const [room] = await db.insert(projectRooms).values({
      id: roomId,
      projectId,
      name,
      description,
      createdBy: user.id,
    }).returning();

    // Add creator as room admin
    await db.insert(roomMembers).values({
      id: nanoid(),
      roomId,
      userId: user.id,
      role: "admin",
    });

    // Log activity
    await db.insert(roomActivityLogs).values({
      id: nanoid(),
      roomId,
      userId: user.id,
      action: "created_room",
      details: `Created room "${name}"`,
    });

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating project room:', error);
    res.status(500).json({ error: "Failed to create project room" });
  }
});

// Get project rooms
router.get("/projects/:projectId/rooms", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId } = req.params;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to view rooms" });
      return;
    }

    const rooms = await db.select({
      id: projectRooms.id,
      name: projectRooms.name,
      description: projectRooms.description,
      createdAt: projectRooms.createdAt,
      createdBy: projectRooms.createdBy,
      isActive: projectRooms.isActive,
      memberCount: count(roomMembers.userId),
      messageCount: count(roomMessages.id),
    })
      .from(projectRooms)
      .leftJoin(roomMembers, eq(projectRooms.id, roomMembers.roomId))
      .leftJoin(roomMessages, eq(projectRooms.id, roomMessages.roomId))
      .where(and(
        eq(projectRooms.projectId, projectId),
        eq(projectRooms.isActive, true)
      ))
      .groupBy(projectRooms.id)
      .orderBy(desc(projectRooms.createdAt));

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching project rooms:', error);
    res.status(500).json({ error: "Failed to fetch project rooms" });
  }
});

// Get room details
router.get("/rooms/:roomId", requireAuth, async (req, res): Promise<void> => {
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
      res.status(403).json({ error: "You must be a room member to view this room" });
      return;
    }

    const [room] = await db.select({
      id: projectRooms.id,
      name: projectRooms.name,
      description: projectRooms.description,
      createdAt: projectRooms.createdAt,
      createdBy: projectRooms.createdBy,
      isActive: projectRooms.isActive,
      projectId: projectRooms.projectId,
    })
      .from(projectRooms)
      .where(eq(projectRooms.id, roomId));

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Get room members
    const members = await db.select({
      id: roomMembers.id,
      userId: roomMembers.userId,
      role: roomMembers.role,
      joinedAt: roomMembers.joinedAt,
      lastActiveAt: roomMembers.lastActiveAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
      .from(roomMembers)
      .leftJoin(users, eq(roomMembers.userId, users.id))
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.isActive, true)
      ))
      .orderBy(desc(roomMembers.lastActiveAt));

    res.json({ ...room, members });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({ error: "Failed to fetch room details" });
  }
});

// Join a room
router.post("/rooms/:roomId/join", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;

  try {
    const [room] = await db.select()
      .from(projectRooms)
      .where(eq(projectRooms.id, roomId));

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, room.projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to join a room" });
      return;
    }

    // Check if already a room member
    const [existingMembership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id)
      ));

    if (existingMembership) {
      res.status(409).json({ error: "Already a room member" });
      return;
    }

    // Add to room
    await db.insert(roomMembers).values({
      id: nanoid(),
      roomId,
      userId: user.id,
      role: "member",
    });

    // Log activity
    await db.insert(roomActivityLogs).values({
      id: nanoid(),
      roomId,
      userId: user.id,
      action: "joined_room",
      details: `Joined room "${room.name}"`,
    });

    res.status(201).json({ message: "Successfully joined room" });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: "Failed to join room" });
  }
});

// Leave a room
router.delete("/rooms/:roomId/leave", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { roomId } = req.params;

  try {
    const [membership] = await db.select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id)
      ));

    if (!membership) {
      res.status(404).json({ error: "Not a room member" });
      return;
    }

    // Remove from room
    await db.delete(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, user.id)
      ));

    // Log activity
    await db.insert(roomActivityLogs).values({
      id: nanoid(),
      roomId,
      userId: user.id,
      action: "left_room",
      details: `Left room`,
    });

    res.json({ message: "Successfully left room" });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: "Failed to leave room" });
  }
});

export default router;
