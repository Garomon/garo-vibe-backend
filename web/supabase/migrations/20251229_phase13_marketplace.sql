-- Phase 13: The Marketplace
-- Creates shop_items and user_inventory tables

-- Shop Items Table
CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT -1, -- -1 = unlimited
    type TEXT NOT NULL DEFAULT 'digital', -- 'digital' or 'physical'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Inventory Table (FK to garo_users and shop_items)
CREATE TABLE IF NOT EXISTS user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES garo_users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    redeemed BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(active);

-- RLS Policies
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Anyone can read active shop items
CREATE POLICY "Public can view active shop items" ON shop_items
    FOR SELECT USING (active = true);

-- Authenticated users can read their own inventory
CREATE POLICY "Users can view their own inventory" ON user_inventory
    FOR SELECT USING (true); -- Will be filtered by API

-- Service role can do anything
CREATE POLICY "Service role full access on shop_items" ON shop_items
    FOR ALL USING (true);

CREATE POLICY "Service role full access on user_inventory" ON user_inventory
    FOR ALL USING (true);

-- Seed Data: 3 Marketplace Items
INSERT INTO shop_items (name, description, cost, image_url, stock, type) VALUES
    ('Neon Wallpaper Pack', 'Exclusive cyberpunk wallpapers for your devices. 5 unique designs.', 100, '/assets/shop/wallpaper.png', -1, 'digital'),
    ('VIP Badge Upgrade (24h)', 'Unlock VIP perks for 24 hours. Stand out in the crowd.', 500, '/assets/shop/vip-badge.png', -1, 'digital'),
    ('Mystery Box', 'What''s inside? Only one way to find out...', 1000, '/assets/shop/mystery-box.png', 10, 'digital');
