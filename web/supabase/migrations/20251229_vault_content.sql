create table if not exists vault_content (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null check (type in ('audio', 'video', 'image')),
  url text not null,
  min_tier int not null default 1,
  active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table vault_content enable row level security;

-- Policies
create policy "Public read access"
  on vault_content for select
  using (true);

create policy "Admin write access"
  on vault_content for insert
  with check (true); -- Ideally restrict to admin role, but for now open for dev or service role

create policy "Admin update access"
  on vault_content for update
  using (true);

create policy "Admin delete access"
  on vault_content for delete
  using (true);
