import { 
  pgTable, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  jsonb,
  primaryKey,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects";
import { users } from "./users";

// Project rooms table - main collaboration space for each project
export const projectRooms = pgTable("project_rooms", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  projectIdIdx: index("idx_project_rooms_project_id").on(table.projectId),
  createdByIdx: index("idx_project_rooms_created_by").on(table.createdBy),
}));

// Room messages table for global messaging within project rooms
export const roomMessages = pgTable("room_messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => projectRooms.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  replyTo: text("reply_to").references(() => roomMessages.id),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  roomIdIdx: index("idx_room_messages_room_id").on(table.roomId),
  senderIdIdx: index("idx_room_messages_sender_id").on(table.senderId),
  createdAtIdx: index("idx_room_messages_created_at").on(table.createdAt),
}));

// Room files table for file sharing within project rooms
export const roomFiles = pgTable("room_files", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => projectRooms.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  mimeType: text("mime_type").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  roomIdIdx: index("idx_room_files_room_id").on(table.roomId),
  uploadedByIdx: index("idx_room_files_uploaded_by").on(table.uploadedBy),
}));

// Project blog posts table for public progress updates and brainstorming
export const projectBlogPosts = pgTable("project_blog_posts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  status: text("status").default("draft"),
  isFeatured: boolean("is_featured").default(false),
  tags: text("tags").array(),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  projectIdIdx: index("idx_project_blog_posts_project_id").on(table.projectId),
  authorIdIdx: index("idx_project_blog_posts_author_id").on(table.authorId),
  statusIdx: index("idx_project_blog_posts_status").on(table.status),
  publishedAtIdx: index("idx_project_blog_posts_published_at").on(table.publishedAt),
}));

// Blog post comments table for engagement
export const blogPostComments = pgTable("blog_post_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => projectBlogPosts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: text("parent_id").references(() => blogPostComments.id),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  postIdIdx: index("idx_blog_post_comments_post_id").on(table.postId),
  authorIdIdx: index("idx_blog_post_comments_author_id").on(table.authorId),
}));

// Blog post likes table for engagement tracking
export const blogPostLikes = pgTable("blog_post_likes", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => projectBlogPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postIdIdx: index("idx_blog_post_likes_post_id").on(table.postId),
  userIdIdx: index("idx_blog_post_likes_user_id").on(table.userId),
}));

// Room members table for managing access to project rooms
export const roomMembers = pgTable("room_members", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => projectRooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  roomIdIdx: index("idx_room_members_room_id").on(table.roomId),
  userIdIdx: index("idx_room_members_user_id").on(table.userId),
}));

// Room activity logs for tracking collaboration activities
export const roomActivityLogs = pgTable("room_activity_logs", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => projectRooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  roomIdIdx: index("idx_room_activity_logs_room_id").on(table.roomId),
  userIdIdx: index("idx_room_activity_logs_user_id").on(table.userId),
  createdAtIdx: index("idx_room_activity_logs_created_at").on(table.createdAt),
}));

// Relations
export const projectRoomsRelations = relations(projectRooms, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectRooms.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [projectRooms.createdBy],
    references: [users.id],
  }),
  messages: many(roomMessages),
  files: many(roomFiles),
  members: many(roomMembers),
  activityLogs: many(roomActivityLogs),
}));

export const roomMessagesRelations = relations(roomMessages, ({ one, many }) => ({
  room: one(projectRooms, {
    fields: [roomMessages.roomId],
    references: [projectRooms.id],
  }),
  sender: one(users, {
    fields: [roomMessages.senderId],
    references: [users.id],
  }),
  replyToMessage: one(roomMessages, {
    fields: [roomMessages.replyTo],
    references: [roomMessages.id],
    relationName: "replies",
  }),
  replies: many(roomMessages, { relationName: "replies" }),
}));

export const roomFilesRelations = relations(roomFiles, ({ one }) => ({
  room: one(projectRooms, {
    fields: [roomFiles.roomId],
    references: [projectRooms.id],
  }),
  uploader: one(users, {
    fields: [roomFiles.uploadedBy],
    references: [users.id],
  }),
}));

export const projectBlogPostsRelations = relations(projectBlogPosts, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectBlogPosts.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [projectBlogPosts.authorId],
    references: [users.id],
  }),
  comments: many(blogPostComments),
  likes: many(blogPostLikes),
}));

export const blogPostCommentsRelations = relations(blogPostComments, ({ one, many }) => ({
  post: one(projectBlogPosts, {
    fields: [blogPostComments.postId],
    references: [projectBlogPosts.id],
  }),
  author: one(users, {
    fields: [blogPostComments.authorId],
    references: [users.id],
  }),
  parentComment: one(blogPostComments, {
    fields: [blogPostComments.parentId],
    references: [blogPostComments.id],
    relationName: "replies",
  }),
  replies: many(blogPostComments, { relationName: "replies" }),
}));

export const blogPostLikesRelations = relations(blogPostLikes, ({ one }) => ({
  post: one(projectBlogPosts, {
    fields: [blogPostLikes.postId],
    references: [projectBlogPosts.id],
  }),
  user: one(users, {
    fields: [blogPostLikes.userId],
    references: [users.id],
  }),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(projectRooms, {
    fields: [roomMembers.roomId],
    references: [projectRooms.id],
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id],
  }),
}));

export const roomActivityLogsRelations = relations(roomActivityLogs, ({ one }) => ({
  room: one(projectRooms, {
    fields: [roomActivityLogs.roomId],
    references: [projectRooms.id],
  }),
  user: one(users, {
    fields: [roomActivityLogs.userId],
    references: [users.id],
  }),
}));

// Types
export type ProjectRoom = typeof projectRooms.$inferSelect;
export type NewProjectRoom = typeof projectRooms.$inferInsert;

export type RoomMessage = typeof roomMessages.$inferSelect;
export type NewRoomMessage = typeof roomMessages.$inferInsert;

export type RoomFile = typeof roomFiles.$inferSelect;
export type NewRoomFile = typeof roomFiles.$inferInsert;

export type ProjectBlogPost = typeof projectBlogPosts.$inferSelect;
export type NewProjectBlogPost = typeof projectBlogPosts.$inferInsert;

export type BlogPostComment = typeof blogPostComments.$inferSelect;
export type NewBlogPostComment = typeof blogPostComments.$inferInsert;

export type BlogPostLike = typeof blogPostLikes.$inferSelect;
export type NewBlogPostLike = typeof blogPostLikes.$inferInsert;

export type RoomMember = typeof roomMembers.$inferSelect;
export type NewRoomMember = typeof roomMembers.$inferInsert;

export type RoomActivityLog = typeof roomActivityLogs.$inferSelect;
export type NewRoomActivityLog = typeof roomActivityLogs.$inferInsert;
