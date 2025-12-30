-- Phase 14: Leaderboard & Nicknames
-- Add nickname column to garo_users

ALTER TABLE garo_users ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_garo_users_xp ON garo_users(xp DESC);
