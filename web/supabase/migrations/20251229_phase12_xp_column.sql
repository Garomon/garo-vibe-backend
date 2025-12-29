-- Add XP column to garo_users to track Rave-to-Earn progress
ALTER TABLE garo_users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- Optional: Create a function to safely increment XP (prevents race conditions)
create or replace function increment_xp(row_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
begin
  update garo_users
  set xp = xp + amount
  where id = row_id;
end;
$$;
