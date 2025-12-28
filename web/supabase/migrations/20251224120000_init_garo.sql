-- GΛRO VIBE Initial Schema

create table if not exists garo_users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  email text,
  tier int default 1,
  attendance_count int default 0,
  last_attendance timestamptz,
  created_at timestamptz default now()
);

create table if not exists garo_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references garo_users(id),
  event_date timestamptz default now(),
  location text,
  proof_tx text
);

-- Enable RLS (Row Level Security) - Optional for now but good practice
alter table garo_users enable row level security;
alter table garo_attendance_logs enable row level security;

-- Policies (Simplified for prototype)
create policy "Allow read access to everyone" on garo_users for select using (true);
create policy "Allow insert/update to authenticated service role" on garo_users for all using (true); -- Requires Service Role for backend writes
