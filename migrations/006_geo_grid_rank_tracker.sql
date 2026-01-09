-- migrations/006_geo_grid_rank_tracker.sql
-- Geo-Grid Rank Tracker: Track keyword rankings across geographic grid points

-- 1. Grid Configurations - stores user's saved grid setups
CREATE TABLE IF NOT EXISTS geo_grid_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  -- Center point (from company profile city or custom)
  center_lat DECIMAL(10, 7) NOT NULL,
  center_lng DECIMAL(10, 7) NOT NULL,
  center_city TEXT,
  center_state TEXT,
  -- Grid settings
  grid_size INTEGER NOT NULL CHECK (grid_size IN (3, 5, 7)), -- 3x3, 5x5, 7x7
  radius_miles DECIMAL(5, 2) NOT NULL CHECK (radius_miles IN (1, 3, 5, 10, 15, 25)),
  -- Target domain to track
  target_domain TEXT NOT NULL,
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_geo_grid_configs_user ON geo_grid_configs(user_id);

-- 2. Tracked Keywords - keywords being tracked per grid config
CREATE TABLE IF NOT EXISTS geo_grid_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES geo_grid_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(config_id, keyword)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_geo_grid_keywords_config ON geo_grid_keywords(config_id);
CREATE INDEX IF NOT EXISTS idx_geo_grid_keywords_user ON geo_grid_keywords(user_id);

-- 3. Scan History - each scan run
CREATE TABLE IF NOT EXISTS geo_grid_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES geo_grid_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  -- Scan metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Grid snapshot at scan time
  grid_size INTEGER NOT NULL,
  radius_miles DECIMAL(5, 2) NOT NULL,
  center_lat DECIMAL(10, 7) NOT NULL,
  center_lng DECIMAL(10, 7) NOT NULL,
  -- Stats
  total_points INTEGER NOT NULL,
  points_completed INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_messages JSONB,
  -- Weekly tracking
  week_number INTEGER, -- ISO week number
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for history queries
CREATE INDEX IF NOT EXISTS idx_geo_grid_scans_config ON geo_grid_scans(config_id);
CREATE INDEX IF NOT EXISTS idx_geo_grid_scans_user ON geo_grid_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_grid_scans_week ON geo_grid_scans(year, week_number);
CREATE INDEX IF NOT EXISTS idx_geo_grid_scans_created ON geo_grid_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_grid_scans_status ON geo_grid_scans(status);

-- 4. Rank Snapshots - individual point results from each scan
CREATE TABLE IF NOT EXISTS geo_grid_rank_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES geo_grid_scans(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES geo_grid_keywords(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  -- Grid position
  grid_row INTEGER NOT NULL,
  grid_col INTEGER NOT NULL,
  point_lat DECIMAL(10, 7) NOT NULL,
  point_lng DECIMAL(10, 7) NOT NULL,
  -- Rank results
  rank_position INTEGER, -- NULL if not found in top 100
  serp_url TEXT, -- URL that ranked
  serp_title TEXT,
  serp_snippet TEXT,
  -- Local pack data
  local_pack_position INTEGER, -- Position in local pack if present
  is_in_local_pack BOOLEAN DEFAULT false,
  -- Top competitors at this point
  top_3_competitors JSONB, -- [{domain, position, title}]
  -- Raw SERP features detected
  serp_features JSONB, -- ['local_pack', 'featured_snippet', 'paa', etc.]
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_geo_grid_snapshots_scan ON geo_grid_rank_snapshots(scan_id);
CREATE INDEX IF NOT EXISTS idx_geo_grid_snapshots_keyword ON geo_grid_rank_snapshots(keyword_id);
CREATE INDEX IF NOT EXISTS idx_geo_grid_snapshots_position ON geo_grid_rank_snapshots(grid_row, grid_col);
CREATE INDEX IF NOT EXISTS idx_geo_grid_snapshots_user ON geo_grid_rank_snapshots(user_id);

-- 5. Aggregate Stats - pre-computed weekly stats for fast chart rendering
CREATE TABLE IF NOT EXISTS geo_grid_weekly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES geo_grid_configs(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES geo_grid_keywords(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES geo_grid_scans(id) ON DELETE SET NULL,
  -- Time period
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  -- Aggregate stats
  avg_rank DECIMAL(5, 2),
  best_rank INTEGER,
  worst_rank INTEGER,
  points_ranking INTEGER, -- How many points have a rank
  points_top_3 INTEGER,
  points_top_10 INTEGER,
  points_top_20 INTEGER,
  points_not_found INTEGER,
  total_points INTEGER,
  -- Local pack stats
  points_in_local_pack INTEGER,
  avg_local_pack_position DECIMAL(5, 2),
  -- Trend vs previous week
  rank_change DECIMAL(5, 2),
  visibility_score DECIMAL(5, 2), -- 0-100 score based on rankings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(config_id, keyword_id, year, week_number)
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_geo_grid_weekly_stats_time ON geo_grid_weekly_stats(config_id, keyword_id, year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_geo_grid_weekly_stats_user ON geo_grid_weekly_stats(user_id);

-- Function to calculate visibility score
-- Score formula: sum of (101 - rank) for each ranking point, normalized to 0-100
COMMENT ON COLUMN geo_grid_weekly_stats.visibility_score IS 'Visibility score 0-100: higher is better. Based on sum of inverted ranks.';
