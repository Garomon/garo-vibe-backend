-- Migration: Create garo_events table for Event Management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS garo_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME,
    location TEXT,
    description TEXT,
    capacity INTEGER DEFAULT 100,
    tickets_sent INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'UPCOMING', -- 'UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT -- Admin wallet that created it
);

-- Add event_id to pending_invites
ALTER TABLE pending_invites ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES garo_events(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_garo_events_date ON garo_events(date);
CREATE INDEX IF NOT EXISTS idx_garo_events_status ON garo_events(status);
