-- GΛRO VIBE Phase 12: Identity & Control
-- Add active column for ban functionality

ALTER TABLE garo_users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
