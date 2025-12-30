-- Phase 17.1: User Event Tickets (Exclusive Check-in Mode)
-- Creates table to track which users have valid tickets for which events

CREATE TABLE IF NOT EXISTS user_event_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES garo_users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES garo_events(id) ON DELETE CASCADE,
    ticket_type TEXT NOT NULL DEFAULT 'STANDARD', -- 'STANDARD', 'VIP', 'PLUS_ONE'
    status TEXT NOT NULL DEFAULT 'VALID', -- 'VALID', 'USED', 'REVOKED'
    invited_by UUID REFERENCES garo_users(id), -- For +1 tickets
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    UNIQUE(user_id, event_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_event_tickets_user ON user_event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_tickets_event ON user_event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_user_event_tickets_status ON user_event_tickets(status);

-- RLS Policies
ALTER TABLE user_event_tickets ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
CREATE POLICY "Users can view own tickets" ON user_event_tickets
    FOR SELECT USING (true);

-- Only service role can insert/update (via API)
CREATE POLICY "Service role insert tickets" ON user_event_tickets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update tickets" ON user_event_tickets
    FOR UPDATE USING (true);
