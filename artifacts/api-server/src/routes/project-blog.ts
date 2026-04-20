import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { 
  projectBlogPosts, 
  blogPostComments, 
  blogPostLikes,
  projectMembersTable,
  users,
  projects
} from "@workspace/db";
import { requireAuth, getCurrentUser } from "../lib/auth";
import { nanoid } from "../lib/nanoid";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";

const router: IRouter = Router();

// Create a blog post
router.post("/projects/:projectId/blog", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId } = req.params;
  const { title, content, excerpt, tags = [], status = "draft", isFeatured = false } = req.body;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to create blog posts" });
      return;
    }

    // Validate required fields
    if (!title || title.trim() === "") {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    if (!content || content.trim() === "") {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    // Create blog post
    const [blogPost] = await db.insert(projectBlogPosts).values({
      id: nanoid(),
      projectId,
      authorId: user.id,
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      tags,
      status,
      isFeatured,
      publishedAt: status === "published" ? new Date() : null,
    }).returning();

    res.status(201).json(blogPost);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

// Get project blog posts
router.get("/projects/:projectId/blog", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId } = req.params;
  const { 
    status = "published",
    limit = "20", 
    offset = "0", 
    search,
    tags,
    authorId,
    featured 
  } = req.query;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to view blog posts" });
      return;
    }

    // Build query
    let query = db.select({
      id: projectBlogPosts.id,
      title: projectBlogPosts.title,
      excerpt: projectBlogPosts.excerpt,
      status: projectBlogPosts.status,
      isFeatured: projectBlogPosts.isFeatured,
      tags: projectBlogPosts.tags,
      viewCount: projectBlogPosts.viewCount,
      likeCount: projectBlogPosts.likeCount,
      commentCount: projectBlogPosts.commentCount,
      publishedAt: projectBlogPosts.publishedAt,
      createdAt: projectBlogPosts.createdAt,
      updatedAt: projectBlogPosts.updatedAt,
      authorId: projectBlogPosts.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorImage: users.image,
    })
      .from(projectBlogPosts)
      .leftJoin(users, eq(projectBlogPosts.authorId, users.id))
      .where(eq(projectBlogPosts.projectId, projectId));

    // Apply filters
    const conditions = [];
    
    if (status !== "all") {
      conditions.push(eq(projectBlogPosts.status, status as string));
    }
    
    if (search) {
      conditions.push(sql`${projectBlogPosts.title} ILIKE ${`%${search}%`} OR ${projectBlogPosts.excerpt} ILIKE ${`%${search}%`} OR ${projectBlogPosts.content} ILIKE ${`%${search}%`}`);
    }
    
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      conditions.push(sql`${projectBlogPosts.tags} && ${tagList}`);
    }
    
    if (authorId) {
      conditions.push(eq(projectBlogPosts.authorId, authorId as string));
    }
    
    if (featured !== undefined) {
      conditions.push(eq(projectBlogPosts.isFeatured, featured === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering and pagination
    query = query.orderBy(desc(projectBlogPosts.publishedAt || projectBlogPosts.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const blogPosts = await query;

    res.json(blogPosts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// Get a single blog post
router.get("/projects/:projectId/blog/:postId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId, postId } = req.params;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to view blog posts" });
      return;
    }

    // Get blog post
    const [blogPost] = await db.select({
      id: projectBlogPosts.id,
      title: projectBlogPosts.title,
      content: projectBlogPosts.content,
      excerpt: projectBlogPosts.excerpt,
      status: projectBlogPosts.status,
      isFeatured: projectBlogPosts.isFeatured,
      tags: projectBlogPosts.tags,
      viewCount: projectBlogPosts.viewCount,
      likeCount: projectBlogPosts.likeCount,
      commentCount: projectBlogPosts.commentCount,
      publishedAt: projectBlogPosts.publishedAt,
      createdAt: projectBlogPosts.createdAt,
      updatedAt: projectBlogPosts.updatedAt,
      authorId: projectBlogPosts.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorImage: users.image,
    })
      .from(projectBlogPosts)
      .leftJoin(users, eq(projectBlogPosts.authorId, users.id))
      .where(and(
        eq(projectBlogPosts.id, postId),
        eq(projectBlogPosts.projectId, projectId)
      ));

    if (!blogPost) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    // Increment view count
    await db.update(projectBlogPosts)
      .set({ viewCount: sql`${projectBlogPosts.viewCount} + 1` })
      .where(eq(projectBlogPosts.id, postId));

    res.json(blogPost);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// Update a blog post
router.put("/projects/:projectId/blog/:postId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId, postId } = req.params;
  const { title, content, excerpt, tags, status, isFeatured } = req.body;

  try {
    // Get blog post and check permissions
    const [blogPost] = await db.select()
      .from(projectBlogPosts)
      .where(and(
        eq(projectBlogPosts.id, postId),
        eq(projectBlogPosts.projectId, projectId)
      ));

    if (!blogPost) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    // Check if user is author or project admin
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    const canUpdate = blogPost.authorId === user.id || 
      (membership && membership.role === "LEAD");

    if (!canUpdate) {
      res.status(403).json({ error: "You can only update your own posts or be a project lead" });
      return;
    }

    // Update blog post
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (excerpt !== undefined) updateData.excerpt = excerpt?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "published" && blogPost.status !== "published") {
        updateData.publishedAt = new Date();
      }
    }
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

    const [updatedPost] = await db.update(projectBlogPosts)
      .set(updateData)
      .where(eq(projectBlogPosts.id, postId))
      .returning();

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

// Delete a blog post
router.delete("/projects/:projectId/blog/:postId", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId, postId } = req.params;

  try {
    // Get blog post and check permissions
    const [blogPost] = await db.select()
      .from(projectBlogPosts)
      .where(and(
        eq(projectBlogPosts.id, postId),
        eq(projectBlogPosts.projectId, projectId)
      ));

    if (!blogPost) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    // Check if user is author or project admin
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    const canDelete = blogPost.authorId === user.id || 
      (membership && membership.role === "LEAD");

    if (!canDelete) {
      res.status(403).json({ error: "You can only delete your own posts or be a project lead" });
      return;
    }

    // Delete blog post (cascade will handle comments and likes)
    await db.delete(projectBlogPosts)
      .where(eq(projectBlogPosts.id, postId));

    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

// Like/unlike a blog post
router.post("/projects/:projectId/blog/:postId/like", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId, postId } = req.params;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to like posts" });
      return;
    }

    // Check if already liked
    const [existingLike] = await db.select()
      .from(blogPostLikes)
      .where(and(
        eq(blogPostLikes.postId, postId),
        eq(blogPostLikes.userId, user.id)
      ));

    if (existingLike) {
      // Unlike
      await db.delete(blogPostLikes)
        .where(and(
          eq(blogPostLikes.postId, postId),
          eq(blogPostLikes.userId, user.id)
        ));

      await db.update(projectBlogPosts)
        .set({ likeCount: sql`${projectBlogPosts.likeCount} - 1` })
        .where(eq(projectBlogPosts.id, postId));

      res.json({ liked: false });
    } else {
      // Like
      await db.insert(blogPostLikes).values({
        id: nanoid(),
        postId,
        userId: user.id,
      });

      await db.update(projectBlogPosts)
        .set({ likeCount: sql`${projectBlogPosts.likeCount} + 1` })
        .where(eq(projectBlogPosts.id, postId));

      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// Get blog post comments
router.get("/projects/:projectId/blog/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId, postId } = req.params;
  const { limit = "50", offset = "0" } = req.query;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to view comments" });
      return;
    }

    const comments = await db.select({
      id: blogPostComments.id,
      content: blogPostComments.content,
      parentId: blogPostComments.parentId,
      isApproved: blogPostComments.isApproved,
      createdAt: blogPostComments.createdAt,
      updatedAt: blogPostComments.updatedAt,
      authorId: blogPostComments.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorImage: users.image,
    })
      .from(blogPostComments)
      .leftJoin(users, eq(blogPostComments.authorId, users.id))
      .where(and(
        eq(blogPostComments.postId, postId),
        eq(blogPostComments.isApproved, true)
      ))
      .orderBy(asc(blogPostComments.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Add a comment to a blog post
router.post("/projects/:projectId/blog/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const user = getCurrentUser(req);
  const { projectId, postId } = req.params;
  const { content, parentId } = req.body;

  try {
    // Check if user is a project member
    const [membership] = await db.select()
      .from(projectMembersTable)
      .where(and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, user.id)
      ));

    if (!membership) {
      res.status(403).json({ error: "You must be a project member to comment" });
      return;
    }

    if (!content || content.trim() === "") {
      res.status(400).json({ error: "Comment content is required" });
      return;
    }

    // Check if parent comment exists (if provided)
    if (parentId) {
      const [parentComment] = await db.select()
        .from(blogPostComments)
        .where(and(
          eq(blogPostComments.id, parentId),
          eq(blogPostComments.postId, postId)
        ));

      if (!parentComment) {
        res.status(400).json({ error: "Invalid parent comment" });
        return;
      }
    }

    // Create comment
    const [comment] = await db.insert(blogPostComments).values({
      id: nanoid(),
      postId,
      authorId: user.id,
      content: content.trim(),
      parentId: parentId || null,
    }).returning();

    // Update comment count
    await db.update(projectBlogPosts)
      .set({ commentCount: sql`${projectBlogPosts.commentCount} + 1` })
      .where(eq(projectBlogPosts.id, postId));

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

export default router;
