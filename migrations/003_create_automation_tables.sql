-- Migration: Create AI Automation Tables
-- Date: 2024-12-18
-- Description: Creates all tables needed for AI automation features with proper user isolation

-- ============================================================
-- Daily Usage Tracking Table
-- Enforces 20 blogs/day limit per user
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  blogs_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one record per user per day
CREATE UNIQUE INDEX IF NOT EXISTS daily_usage_user_date_idx
ON daily_usage (user_id, date);

-- ============================================================
-- Automation Settings Table
-- User preferences for AI automation features
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  allow_build_entire_site BOOLEAN DEFAULT FALSE,
  allow_auto_create_daily_blogs BOOLEAN DEFAULT FALSE,
  allow_auto_schedule_blogs BOOLEAN DEFAULT FALSE,
  allow_auto_post_blogs BOOLEAN DEFAULT FALSE,
  daily_blog_frequency INTEGER DEFAULT 1, -- 1-5 blogs per day
  auto_post_platform TEXT DEFAULT 'wordpress', -- wordpress | ghl
  auto_create_mode TEXT DEFAULT 'queue_for_review', -- automatic | queue_for_review
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Generation Queue Table
-- For batch and scheduled blog generation
-- ============================================================
CREATE TABLE IF NOT EXISTS generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id TEXT, -- Groups items in a batch together
  type TEXT NOT NULL, -- blog | service_page | location_page
  topic TEXT NOT NULL,
  keywords TEXT, -- comma-separated primary/secondary keywords
  status TEXT DEFAULT 'pending', -- pending | generating | generated | scheduled | published | failed
  priority INTEGER DEFAULT 0, -- Higher = process first
  scheduled_for TIMESTAMP, -- When to auto-schedule the generated blog
  generated_draft_id UUID REFERENCES drafts(id) ON DELETE SET NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 0, -- Retry counter
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS generation_queue_status_priority_idx
ON generation_queue (status, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS generation_queue_user_idx
ON generation_queue (user_id);

-- ============================================================
-- Site Structure Proposals Table
-- AI-generated site architecture for user approval
-- ============================================================
CREATE TABLE IF NOT EXISTS site_structure_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft', -- draft | proposed | approved | generating | completed | failed
  industry TEXT,
  proposed_structure JSONB, -- { homepage, servicePages, locationPages, blogTopics, sitemap }
  ai_reasoning TEXT, -- Why AI proposed this structure
  user_modifications JSONB, -- { removedPages, addedPages, changedPages }
  generation_progress JSONB, -- { total, completed, current, errors }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_structure_proposals_user_idx
ON site_structure_proposals (user_id);

-- ============================================================
-- Add scheduling fields to drafts table (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drafts' AND column_name = 'scheduled_publish_at'
  ) THEN
    ALTER TABLE drafts ADD COLUMN scheduled_publish_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drafts' AND column_name = 'schedule_status'
  ) THEN
    ALTER TABLE drafts ADD COLUMN schedule_status TEXT DEFAULT 'unscheduled';
  END IF;
END $$;

-- ============================================================
-- Verification Queries (run these to verify tables exist)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('daily_usage', 'automation_settings', 'generation_queue', 'site_structure_proposals');
