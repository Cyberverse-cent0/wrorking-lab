-- ScholarForge Database Initialization Script
-- This script initializes the database with basic setup

-- Create database if it doesn't exist
-- (This is handled by PostgreSQL environment variables)

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set up search path
SET search_path TO public;

-- Create indexes for better performance
-- (These will be created by Drizzle migrations)

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'ScholarForge database initialized successfully';
END $$;
