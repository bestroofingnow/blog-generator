-- Knowledge Base Tables Migration
-- Run this in your Neon database SQL console

-- Table 1: knowledge_base (stores your company facts)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  is_ai_generated BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 2: knowledge_base_history (tracks changes)
CREATE TABLE IF NOT EXISTS knowledge_base_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT,
  change_source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Done! Your Knowledge Base is ready to use.
