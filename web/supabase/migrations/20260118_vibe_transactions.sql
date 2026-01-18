-- Migration: VIBE Transactions System
-- Date: 2026-01-18
-- Purpose: Track all VIBE (XP) transactions for transparency and history

-- =============================================
-- TABLE: vibe_transactions
-- =============================================
-- Complete history of all VIBE earned and spent

CREATE TABLE IF NOT EXISTS vibe_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who
    user_id UUID NOT NULL REFERENCES garo_users(id) ON DELETE CASCADE,

    -- What
    amount INTEGER NOT NULL, -- positive = earn, negative = spend
    balance_after INTEGER, -- balance after this transaction (for audit)

    -- Why
    type TEXT NOT NULL, -- CHECKIN, REFERRAL, PURCHASE, REWARD, BONUS, DECAY, etc.
    description TEXT,

    -- Reference (optional link to related entity)
    reference_type TEXT, -- 'event', 'shop_item', 'user', 'badge', etc.
    reference_id UUID,

    -- When
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vibe_tx_user ON vibe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vibe_tx_type ON vibe_transactions(type);
CREATE INDEX IF NOT EXISTS idx_vibe_tx_created ON vibe_transactions(created_at DESC);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE vibe_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see their own transactions
CREATE POLICY "Users can view own transactions" ON vibe_transactions
    FOR SELECT USING (true);

-- Service role can insert
CREATE POLICY "Service role full access" ON vibe_transactions
    FOR ALL USING (true);

-- =============================================
-- FUNCTION: log_vibe_transaction
-- =============================================
-- Helper function to log a transaction and update user balance

CREATE OR REPLACE FUNCTION log_vibe_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
    tx_id UUID;
BEGIN
    -- Update user's XP balance
    UPDATE garo_users
    SET xp = COALESCE(xp, 0) + p_amount
    WHERE id = p_user_id
    RETURNING xp INTO new_balance;

    -- Insert transaction record
    INSERT INTO vibe_transactions (
        user_id, amount, balance_after, type, description, reference_type, reference_id
    ) VALUES (
        p_user_id, p_amount, new_balance, p_type, p_description, p_reference_type, p_reference_id
    )
    RETURNING id INTO tx_id;

    RETURN tx_id;
END;
$$;

-- =============================================
-- VIBE Earning Types Reference
-- =============================================
-- CHECKIN: +100 VIBE per event check-in
-- FIRST_EVENT: +500 VIBE bonus for first ever event
-- REFERRAL: +50 VIBE when invited person attends first event
-- REFERRAL_TIER_UP: +200 VIBE when referral reaches Tier 2
-- STREAK: +150 VIBE for attending 3 events in a row
-- BIRTHDAY: +100 VIBE for attending event on birthday
-- PROFILE_COMPLETE: +50 VIBE for completing profile
-- DAILY_LOGIN: +10 VIBE for daily app check-in
-- BADGE_EARNED: varies per badge
-- ADMIN_BONUS: manual admin reward

-- VIBE Spending Types Reference
-- PURCHASE: spending at shop
-- REDEEM: redeeming a reward
-- SKIP_LINE: -200 VIBE to skip line
-- PLUS_ONE: -300 VIBE for extra invite
-- DECAY: -X VIBE for inactivity (oxidation)

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE vibe_transactions IS 'Complete history of all VIBE token transactions';
COMMENT ON COLUMN vibe_transactions.amount IS 'Positive = earned, Negative = spent';
COMMENT ON COLUMN vibe_transactions.balance_after IS 'User balance after this transaction';
COMMENT ON COLUMN vibe_transactions.type IS 'Transaction type: CHECKIN, REFERRAL, PURCHASE, etc.';
COMMENT ON FUNCTION log_vibe_transaction IS 'Atomically logs transaction and updates user balance';
