-- Migration: Badges System
-- Date: 2026-01-18
-- Purpose: Achievement badges for members

-- =============================================
-- CLEANUP: Drop existing objects if they exist
-- =============================================

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS check_and_grant_badges(UUID);
DROP FUNCTION IF EXISTS grant_badge(UUID, TEXT, UUID, TEXT);

-- Drop tables (user_badges depends on badges)
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;

-- =============================================
-- TABLE: badges
-- =============================================
-- Available badges in the system

CREATE TABLE badges (
    id TEXT PRIMARY KEY, -- e.g., 'day_one', 'connector', 'sunrise_survivor'
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL, -- emoji or image URL
    category TEXT DEFAULT 'achievement', -- 'achievement', 'event', 'special', 'vip'

    -- Auto-grant conditions (optional)
    auto_grant BOOLEAN DEFAULT false,
    grant_condition JSONB, -- e.g., {"type": "events_attended", "value": 5}

    -- Rarity/ordering
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    sort_order INTEGER DEFAULT 0,

    -- Active status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: user_badges
-- =============================================
-- Badges earned by users

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES garo_users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,

    -- Award info
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    awarded_by UUID REFERENCES garo_users(id), -- null if auto-granted
    award_reason TEXT, -- optional custom reason

    -- Unique constraint: user can only have each badge once
    UNIQUE(user_id, badge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
DROP POLICY IF EXISTS "Service role full access badges" ON badges;
DROP POLICY IF EXISTS "Service role full access user_badges" ON user_badges;

-- Anyone can see badges
CREATE POLICY "Anyone can view badges" ON badges
    FOR SELECT USING (true);

-- Anyone can see user badges (public profiles)
CREATE POLICY "Anyone can view user badges" ON user_badges
    FOR SELECT USING (true);

-- Service role can manage all
CREATE POLICY "Service role full access badges" ON badges
    FOR ALL USING (true);

CREATE POLICY "Service role full access user_badges" ON user_badges
    FOR ALL USING (true);

-- =============================================
-- DEFAULT BADGES
-- =============================================

INSERT INTO badges (id, name, description, icon, category, rarity, auto_grant, grant_condition, sort_order) VALUES
    -- Achievement badges (auto-granted)
    ('day_one', 'Day One', 'Among the first 50 members', '🌟', 'achievement', 'legendary', false, NULL, 1),
    ('first_event', 'First Steps', 'Attended your first event', '👣', 'achievement', 'common', true, '{"type": "events_attended", "value": 1}', 10),
    ('regular', 'Regular', 'Attended 5 events', '🏠', 'achievement', 'common', true, '{"type": "events_attended", "value": 5}', 20),
    ('dedicated', 'Dedicated', 'Attended 10 events', '💪', 'achievement', 'rare', true, '{"type": "events_attended", "value": 10}', 30),
    ('veteran', 'Veteran', 'Attended 25 events', '🎖️', 'achievement', 'epic', true, '{"type": "events_attended", "value": 25}', 40),
    ('legend', 'Legend', 'Attended 50 events', '🏆', 'achievement', 'legendary', true, '{"type": "events_attended", "value": 50}', 50),

    -- Referral badges
    ('connector', 'Connector', 'Invited 3 people who became members', '🔗', 'achievement', 'rare', true, '{"type": "referrals", "value": 3}', 60),
    ('ambassador', 'Ambassador', 'Invited 10 people who became members', '🌐', 'achievement', 'epic', true, '{"type": "referrals", "value": 10}', 70),

    -- Special badges (manually granted)
    ('sunrise_survivor', 'Sunrise Survivor', 'Stayed until sunrise', '🌅', 'special', 'rare', false, NULL, 100),
    ('birthday_raver', 'Birthday Raver', 'Attended an event on your birthday', '🎂', 'special', 'rare', false, NULL, 110),
    ('vip', 'VIP', 'Personally recognized by GΛRO', '👑', 'vip', 'legendary', false, NULL, 200),
    ('staff', 'Staff', 'Part of the crew', '🎧', 'vip', 'legendary', false, NULL, 210),

    -- Event-specific badges (examples)
    ('rooftop_og', 'Rooftop OG', 'Attended the first rooftop session', '🏙️', 'event', 'legendary', false, NULL, 300)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- FUNCTION: check_and_grant_badges
-- =============================================
-- Check if user qualifies for any auto-grant badges

CREATE OR REPLACE FUNCTION check_and_grant_badges(p_user_id UUID)
RETURNS TABLE(badge_id TEXT, badge_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_events INTEGER;
    user_referrals INTEGER;
    badge_rec RECORD;
    condition_type TEXT;
    condition_value INTEGER;
BEGIN
    -- Get user stats
    SELECT attendance_count INTO user_events FROM garo_users WHERE id = p_user_id;
    SELECT COUNT(*) INTO user_referrals FROM garo_users WHERE invited_by = p_user_id AND tier >= 1;

    -- Loop through auto-grant badges
    FOR badge_rec IN
        SELECT b.id, b.name, b.grant_condition
        FROM badges b
        WHERE b.auto_grant = true
        AND b.active = true
        AND b.grant_condition IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM user_badges ub
            WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
        )
    LOOP
        condition_type := badge_rec.grant_condition->>'type';
        condition_value := (badge_rec.grant_condition->>'value')::INTEGER;

        -- Check conditions
        IF condition_type = 'events_attended' AND user_events >= condition_value THEN
            INSERT INTO user_badges (user_id, badge_id, award_reason)
            VALUES (p_user_id, badge_rec.id, 'Auto-granted for ' || condition_value || ' events');

            badge_id := badge_rec.id;
            badge_name := badge_rec.name;
            RETURN NEXT;
        ELSIF condition_type = 'referrals' AND user_referrals >= condition_value THEN
            INSERT INTO user_badges (user_id, badge_id, award_reason)
            VALUES (p_user_id, badge_rec.id, 'Auto-granted for ' || condition_value || ' referrals');

            badge_id := badge_rec.id;
            badge_name := badge_rec.name;
            RETURN NEXT;
        END IF;
    END LOOP;

    RETURN;
END;
$$;

-- =============================================
-- FUNCTION: grant_badge
-- =============================================
-- Manually grant a badge to a user

CREATE OR REPLACE FUNCTION grant_badge(
    p_user_id UUID,
    p_badge_id TEXT,
    p_awarded_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_badges (user_id, badge_id, awarded_by, award_reason)
    VALUES (p_user_id, p_badge_id, p_awarded_by, p_reason)
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    RETURN FOUND;
END;
$$;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE badges IS 'Available badges/achievements in the system';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
COMMENT ON FUNCTION check_and_grant_badges IS 'Check and auto-grant eligible badges to a user';
COMMENT ON FUNCTION grant_badge IS 'Manually grant a badge to a user';
