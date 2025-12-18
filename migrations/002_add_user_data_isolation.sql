-- Migration: Add user data isolation improvements
-- Date: 2024-12-18
-- Description: Adds unique constraint on daily_usage to prevent duplicate user+date records

-- Add unique index on daily_usage for user_id + date
-- This ensures each user can only have one usage record per day
CREATE UNIQUE INDEX IF NOT EXISTS daily_usage_user_date_idx ON daily_usage (user_id, date);

-- Verify all tables have proper user isolation (these should already exist, but verify)
-- The foreign keys with ON DELETE CASCADE ensure data is properly isolated:
-- - profiles: user_id is primary key
-- - drafts: user_id with cascade
-- - draft_images: user_id with cascade
-- - knowledge_base: user_id with cascade
-- - knowledge_base_history: user_id with cascade
-- - daily_usage: user_id with cascade
-- - automation_settings: user_id is primary key
-- - generation_queue: user_id with cascade
-- - site_structure_proposals: user_id with cascade
-- - security_questions: user_id with cascade

-- Verify the existing data doesn't have duplicates before the unique constraint
-- This query finds any duplicate user+date combinations (should return empty)
-- SELECT user_id, date, COUNT(*)
-- FROM daily_usage
-- GROUP BY user_id, date
-- HAVING COUNT(*) > 1;

-- If duplicates exist, you can merge them with:
-- DELETE FROM daily_usage a USING daily_usage b
-- WHERE a.id < b.id AND a.user_id = b.user_id AND a.date = b.date;
