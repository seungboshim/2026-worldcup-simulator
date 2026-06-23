'use server'
import { getSql } from '@/lib/db'

export async function submitAwards(
  browserId: string,
  picks: { goldenBall: string; goldenBoot: string },
): Promise<{ ok: boolean }> {
  if (!browserId) throw new Error('missing browser id')
  if (!picks.goldenBall || !picks.goldenBoot) throw new Error('both awards required')
  const sql = getSql()
  await sql`
    insert into awards_votes (browser_id, golden_ball, golden_boot, updated_at)
    values (${browserId}, ${picks.goldenBall}, ${picks.goldenBoot}, now())
    on conflict (browser_id) do update set
      golden_ball = excluded.golden_ball,
      golden_boot = excluded.golden_boot,
      updated_at = now()
  `
  return { ok: true }
}
