-- Project Collaboration Schema
-- This file defines the database schema for project collaboration features

-- Project rooms table - main collaboration space for each project
CREATE TABLE IF NOT EXISTS project_rooms (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Room messages table for global messaging within project rooms
CREATE TABLE IF NOT EXISTS room_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'video', 'link')),
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    reply_to TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES project_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (reply_to) REFERENCES room_messages(id)
);

-- Room files table for file sharing within project rooms
CREATE TABLE IF NOT EXISTS room_files (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES project_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Project blog posts table for public progress updates and brainstorming
CREATE TABLE IF NOT EXISTS project_blog_posts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    tags TEXT[],
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Blog post comments table for engagement
CREATE TABLE IF NOT EXISTS blog_post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES project_blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES blog_post_comments(id)
);

-- Blog post likes table for engagement tracking
CREATE TABLE IF NOT EXISTS blog_post_likes (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES project_blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(post_id, user_id)
);

-- Room members table for managing access to project rooms
CREATE TABLE IF NOT EXISTS room_members (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member', 'viewer')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (room_id) REFERENCES project_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(room_id, user_id)
);

-- Room activity logs for tracking collaboration activities
CREATE TABLE IF NOT EXISTS room_activity_logs (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES project_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_rooms_project_id ON project_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rooms_created_by ON project_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_sender_id ON room_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_room_files_room_id ON room_files(room_id);
CREATE INDEX IF NOT EXISTS idx_room_files_uploaded_by ON room_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_blog_posts_project_id ON project_blog_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_blog_posts_author_id ON project_blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_project_blog_posts_status ON project_blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_project_blog_posts_published_at ON project_blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_post_comments_post_id ON blog_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_comments_author_id ON blog_post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_post_id ON blog_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_user_id ON blog_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_activity_logs_room_id ON room_activity_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_room_activity_logs_user_id ON room_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_room_activity_logs_created_at ON room_activity_logs(created_at);
