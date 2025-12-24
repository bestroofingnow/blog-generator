-- Migration: Create Conversation Tables for AI Chat
-- Date: 2024-12-23
-- Description: Creates tables for conversational AI chat interface with tool-calling support

-- ============================================================
-- Conversations Table
-- Chat sessions for each user
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  status TEXT DEFAULT 'active', -- active | archived
  metadata JSONB, -- Store model used, token counts, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient user conversation listing
CREATE INDEX IF NOT EXISTS conversations_user_idx
ON conversations (user_id);

CREATE INDEX IF NOT EXISTS conversations_user_status_idx
ON conversations (user_id, status);

CREATE INDEX IF NOT EXISTS conversations_updated_at_idx
ON conversations (updated_at DESC);

-- ============================================================
-- Conversation Messages Table
-- Individual messages in conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant | system | tool
  content TEXT NOT NULL,
  metadata JSONB, -- Store tool calls, tool results, token usage, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient message retrieval
CREATE INDEX IF NOT EXISTS conversation_messages_conversation_idx
ON conversation_messages (conversation_id);

CREATE INDEX IF NOT EXISTS conversation_messages_created_at_idx
ON conversation_messages (conversation_id, created_at);

-- Index for user's messages (for security verification)
CREATE INDEX IF NOT EXISTS conversation_messages_user_idx
ON conversation_messages (user_id);

-- ============================================================
-- Verification Queries (run these to verify tables exist)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('conversations', 'conversation_messages');
