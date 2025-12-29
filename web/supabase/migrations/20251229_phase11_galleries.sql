-- Phase 11: Multi-Asset Galleries
-- Add gallery_urls column for multi-image support

-- 1. Add gallery_urls column to vault_content
ALTER TABLE vault_content 
ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT NULL;

-- 2. Create user_content_views table for tracking interactions
CREATE TABLE IF NOT EXISTS user_content_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES garo_users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES vault_content(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

-- 3. RLS Policies for user_content_views
ALTER TABLE user_content_views ENABLE ROW LEVEL SECURITY;

-- Users can read their own views
CREATE POLICY "Users can view own content views" ON user_content_views
    FOR SELECT USING (true);

-- Users can insert their own views
CREATE POLICY "Users can insert own content views" ON user_content_views
    FOR INSERT WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_content_views_user_id ON user_content_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_views_content_id ON user_content_views(content_id);
