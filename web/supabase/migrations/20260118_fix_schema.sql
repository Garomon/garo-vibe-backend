-- Migration: Fix schema issues
-- Date: 2026-01-18
-- Fixes:
-- 1. event_attendance FK points to non-existent 'events' table (should be garo_events)
-- 2. pending_invites missing expires_at column
-- 3. garo_users missing last_mint_address and nickname columns

-- =============================================
-- FIX 1: event_attendance FK
-- =============================================
-- Drop the incorrect constraint and add the correct one
-- Note: This may fail if the constraint doesn't exist or has a different name

DO $$
BEGIN
    -- Try to drop the old constraint (may have different naming conventions)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'event_attendance_event_id_fkey'
        AND table_name = 'event_attendance'
    ) THEN
        ALTER TABLE event_attendance DROP CONSTRAINT event_attendance_event_id_fkey;
    END IF;

    -- Add the correct FK to garo_events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'event_attendance_event_id_garo_events_fkey'
        AND table_name = 'event_attendance'
    ) THEN
        ALTER TABLE event_attendance
        ADD CONSTRAINT event_attendance_event_id_garo_events_fkey
        FOREIGN KEY (event_id) REFERENCES garo_events(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not modify event_attendance FK: %', SQLERRM;
END $$;

-- =============================================
-- FIX 2: pending_invites - add expires_at
-- =============================================
ALTER TABLE pending_invites
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set default expiration for existing invites (30 days from creation)
UPDATE pending_invites
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- =============================================
-- FIX 3: garo_users - add missing columns
-- =============================================

-- last_mint_address: stores the Solana address of the user's Proof of Rave NFT
ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS last_mint_address TEXT;

-- nickname: for leaderboard display (may already exist from phase 14)
ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

-- avatar_url: for profile pictures
ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- instagram: social link
ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS instagram TEXT;

-- first_event_date: when they first attended (OG status)
ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS first_event_date DATE;

-- is_og: flag for early adopters (first 50 members)
ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS is_og BOOLEAN DEFAULT false;

-- =============================================
-- Create index for nickname lookups
-- =============================================
CREATE INDEX IF NOT EXISTS idx_garo_users_nickname ON garo_users(nickname);

-- =============================================
-- Update comment
-- =============================================
COMMENT ON TABLE garo_users IS 'Core users table for GARO VIBE - Updated 2026-01-18';
COMMENT ON COLUMN garo_users.last_mint_address IS 'Solana mint address of the user Proof of Rave NFT';
COMMENT ON COLUMN garo_users.is_og IS 'True if user was among first 50 members';
COMMENT ON COLUMN pending_invites.expires_at IS 'When this invite expires (typically 1 day after event)';
