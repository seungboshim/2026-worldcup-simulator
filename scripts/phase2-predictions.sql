-- Phase 2 예측 통계 테이블. Neon은 연결 문자열이 서버 시크릿이라 별도 RLS 불필요(접근은 서버에서만).
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  champion text not null,
  finalists text[] not null,
  semifinalists text[] not null,
  quarterfinalists text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
