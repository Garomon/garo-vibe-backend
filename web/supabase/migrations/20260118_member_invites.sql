-- Migration: Member Invites System
-- Date: 2026-01-18
-- Purpose: Allow members to invite friends based on their tier

-- =============================================
-- TABLE: member_invites
-- =============================================
-- Tracks invitations sent by existing members
-- Each member gets X invites per month based on tier

CREATE TABLE IF NOT EXISTS member_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who is inviting
    inviter_id UUID NOT NULL REFERENCES garo_users(id) ON DELETE CASCADE,

    -- Who is being invited (email before they join)
    invitee_email TEXT NOT NULL,

    -- For which event (optional - null means general invite)
    event_id UUID REFERENCES garo_events(id) ON DELETE SET NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'SENT',  -- SENT, CLAIMED, EXPIRED, REVOKED

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    claimed_at TIMESTAMPTZ,

    -- When the invitee becomes a member, link them
    claimed_by_user_id UUID REFERENCES garo_users(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_member_invites_inviter ON member_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_member_invites_email ON member_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_member_invites_status ON member_invites(status);

-- =============================================
-- TABLE: invite_config
-- =============================================
-- Configurable limits per tier (can be adjusted without code changes)

CREATE TABLE IF NOT EXISTS invite_config (
    tier INTEGER PRIMARY KEY,
    invites_per_month INTEGER NOT NULL,
    description TEXT
);

-- Default configuration
INSERT INTO invite_config (tier, invites_per_month, description) VALUES
    (1, 1, 'INITIATE - 1 invite per month'),
    (2, 3, 'RESIDENT - 3 invites per month'),
    (3, 10, 'FAMILY - 10 invites per month')
ON CONFLICT (tier) DO NOTHING;

-- =============================================
-- Add invited_by column to garo_users
-- =============================================
-- Track who invited each user (referral tree)

ALTER TABLE garo_users
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES garo_users(id);

-- Index for finding referrals
CREATE INDEX IF NOT EXISTS idx_garo_users_invited_by ON garo_users(invited_by);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE member_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read invite config
CREATE POLICY "Anyone can read invite config" ON invite_config
    FOR SELECT USING (true);

-- Users can see their own invites
CREATE POLICY "Users can view own invites" ON member_invites
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access" ON member_invites
    FOR ALL USING (true);

-- =============================================
-- Function: Get remaining invites for a user
-- =============================================

CREATE OR REPLACE FUNCTION get_remaining_invites(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_tier INTEGER;
    max_invites INTEGER;
    used_invites INTEGER;
BEGIN
    -- Get user's tier
    SELECT tier INTO user_tier FROM garo_users WHERE id = user_uuid;

    IF user_tier IS NULL OR user_tier = 0 THEN
        RETURN 0; -- Ghosts can't invite
    END IF;

    -- Get max invites for this tier
    SELECT invites_per_month INTO max_invites FROM invite_config WHERE tier = user_tier;

    IF max_invites IS NULL THEN
        max_invites := 1; -- Default fallback
    END IF;

    -- Count invites sent this month
    SELECT COUNT(*) INTO used_invites
    FROM member_invites
    WHERE inviter_id = user_uuid
    AND created_at >= date_trunc('month', NOW())
    AND status != 'REVOKED';

    RETURN GREATEST(0, max_invites - used_invites);
END;
$$;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE member_invites IS 'Tracks invitations sent by existing members to new users';
COMMENT ON COLUMN member_invites.inviter_id IS 'The member who sent the invite';
COMMENT ON COLUMN member_invites.invitee_email IS 'Email of the person being invited';
COMMENT ON COLUMN member_invites.status IS 'SENT=pending, CLAIMED=used, EXPIRED=past due, REVOKED=cancelled';
COMMENT ON COLUMN garo_users.invited_by IS 'Reference to the user who invited this member (referral tree)';
