create table if not exists awards_votes (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  golden_ball text not null,
  golden_boot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
