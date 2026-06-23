'use server'
import { getSql } from '@/lib/db'
import type { PredictionPicks } from '@/lib/predict'

export async function submitPrediction(
  browserId: string,
  picks: PredictionPicks,
): Promise<{ ok: boolean }> {
  if (!browserId) throw new Error('missing browser id')
  const sql = getSql()
  // neon 태그드 템플릿이 JS 배열을 Postgres text[]로 바인딩(파라미터화 → 인젝션 안전).
  await sql`
    insert into predictions (browser_id, champion, finalists, semifinalists, quarterfinalists, updated_at)
    values (${browserId}, ${picks.champion}, ${picks.finalists}, ${picks.semifinalists}, ${picks.quarterfinalists}, now())
    on conflict (browser_id) do update set
      champion = excluded.champion,
      finalists = excluded.finalists,
      semifinalists = excluded.semifinalists,
      quarterfinalists = excluded.quarterfinalists,
      updated_at = now()
  `
  return { ok: true }
}
