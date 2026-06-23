import { neon } from '@neondatabase/serverless'

// Vercel Neon 통합이 주입하는 DATABASE_URL(풀드) 사용. 서버 전용 시크릿.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

export function getSql() {
  if (!url) throw new Error('DATABASE_URL is not set (connect Neon on Vercel + vercel env pull)')
  return neon(url)
}
