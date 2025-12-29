-- Add column to track the last time a user claimed a Rave reward
-- Used to enforce daily limits in "Training Mode"
ALTER TABLE garo_users ADD COLUMN IF NOT EXISTS last_rave_at TIMESTAMPTZ;
