// env pull 후 1회 실행: awards_votes 테이블 생성.
// 실행: node --env-file=.env.local scripts/create-awards-table.mjs
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL missing — run `vercel env pull .env.local` first')
const sql = neon(url)

await sql`create table if not exists awards_votes (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  golden_ball text not null,
  golden_boot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`

const [{ count }] = await sql`select count(*)::int as count from awards_votes`
console.log('awards_votes table ready, rows:', count)
