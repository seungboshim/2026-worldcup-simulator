// env pull 후 1회 실행: 연결 확인 + predictions 테이블 생성.
// 실행: node --env-file=.env.local scripts/create-table.mjs
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL missing — run `vercel env pull .env.local` first')
const sql = neon(url)

const [{ now }] = await sql`select now()`
console.log('connected:', now)

await sql`create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  champion text not null,
  finalists text[] not null,
  semifinalists text[] not null,
  quarterfinalists text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`

const [{ count }] = await sql`select count(*)::int as count from predictions`
console.log('predictions table ready, rows:', count)
