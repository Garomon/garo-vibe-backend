-- Migration: Create pending_invites table for Lazy Mint system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pending_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    tier_to_mint INTEGER NOT NULL DEFAULT 1,
    nft_type TEXT NOT NULL DEFAULT 'PROOF', -- 'PROOF' for membership card, 'ENTRY' for event ticket
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CLAIMED', 'EXPIRED'
    invited_by TEXT, -- Admin wallet that sent the invite
    created_at TIMESTAMPTZ DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    claimed_by_wallet TEXT -- The actual wallet that claimed it
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_status ON pending_invites(status);
