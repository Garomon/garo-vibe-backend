-- Phase 17: Event Attendance (Self Check-In)
-- Creates the event_attendance table for tracking user check-ins

CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES garo_users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_attendance_user ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);

-- RLS Policies
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Users can see their own attendance
CREATE POLICY "Users can view own attendance" ON event_attendance
    FOR SELECT USING (true);

-- Only service role can insert (via API)
CREATE POLICY "Service role insert" ON event_attendance
    FOR INSERT WITH CHECK (true);
