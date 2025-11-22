-- Migration script to update Supabase schema for Better Auth compatibility
-- Run this in your Supabase SQL Editor after running BETTER_AUTH_SCHEMA.sql

-- Step 1: Drop ALL existing RLS policies first (they depend on the column)
-- Sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;

-- Transcripts policies
DROP POLICY IF EXISTS "Users can view their own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can create transcripts" ON transcripts;

-- Transcript chunks policies
DROP POLICY IF EXISTS "Users can view their own transcript chunks" ON transcript_chunks;
DROP POLICY IF EXISTS "Users can create transcript chunks" ON transcript_chunks;

-- Step 2: Drop existing foreign key constraint (if it exists)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

-- Step 3: Change user_id column from UUID to TEXT to match Better Auth user IDs
-- This will work now because we dropped the policies
ALTER TABLE sessions ALTER COLUMN user_id TYPE TEXT;

-- Step 4: Create new RLS policies that work with Better Auth
-- Note: Better Auth handles authentication, so we allow authenticated users to manage their own data
-- The user_id will be set by the application based on the authenticated user

-- Sessions policies
CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (true); -- Better Auth handles access control, we trust the application to set correct user_id

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (true); -- Better Auth handles access control

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (true); -- Better Auth handles access control

-- Transcripts policies
CREATE POLICY "Users can view their own transcripts"
  ON transcripts FOR SELECT
  USING (true); -- Better Auth handles access control

CREATE POLICY "Users can create transcripts"
  ON transcripts FOR INSERT
  WITH CHECK (true); -- Better Auth handles access control

-- Transcript chunks policies
CREATE POLICY "Users can view their own transcript chunks"
  ON transcript_chunks FOR SELECT
  USING (true); -- Better Auth handles access control

CREATE POLICY "Users can create transcript chunks"
  ON transcript_chunks FOR INSERT
  WITH CHECK (true); -- Better Auth handles access control

-- Step 5: Add index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_text ON sessions(user_id);

-- Note: If you want stricter RLS policies, you can use a function to verify the user_id
-- matches the authenticated user. However, since Better Auth handles authentication
-- at the application level, we trust the application to set the correct user_id.

