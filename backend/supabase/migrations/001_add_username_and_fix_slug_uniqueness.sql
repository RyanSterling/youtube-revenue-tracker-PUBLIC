-- Migration: Add username to users and fix source slug uniqueness for multi-tenancy
-- This enables user-scoped tracking URLs: /u/{username}/l/{sourceSlug}

-- ============================================
-- 1. Add username column to users table
-- ============================================

ALTER TABLE users ADD COLUMN username TEXT UNIQUE;

-- Create index for fast lookups by username (used in tracking routes)
CREATE INDEX idx_users_username ON users(username);

-- Username validation constraint: lowercase alphanumeric and hyphens, 3-30 chars
ALTER TABLE users ADD CONSTRAINT users_username_format
  CHECK (username ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');

COMMENT ON COLUMN users.username IS 'URL-safe username for tracking links: /u/{username}/l/{slug}';

-- ============================================
-- 2. Fix sources slug uniqueness (per-user instead of global)
-- ============================================

-- Drop the global unique constraint on slug
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_slug_key;

-- Drop the old global index if it exists
DROP INDEX IF EXISTS idx_sources_slug;

-- Add composite unique constraint: slug must be unique per user, not globally
ALTER TABLE sources ADD CONSTRAINT sources_user_slug_unique UNIQUE (user_id, slug);

-- Create index for tracking lookups (user_id + slug)
CREATE INDEX idx_sources_user_slug ON sources(user_id, slug);

COMMENT ON CONSTRAINT sources_user_slug_unique ON sources IS 'Slugs must be unique per user, allowing different users to have the same slug';
