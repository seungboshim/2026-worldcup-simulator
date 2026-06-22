import { describe, it, expect } from 'vitest'
import data from '../../data/worldcup-2026.json'
import type { WorldCupData } from '@/types'
const wc = data as unknown as WorldCupData
describe('worldcup-2026 seed', () => {
  it('has 48 teams', () => { expect(wc.teams).toHaveLength(48) })
  it('has 12 groups with 4 teams each', () => {
    const byGroup = new Map<string, number>()
    for (const t of wc.teams) byGroup.set(t.groupId, (byGroup.get(t.groupId) ?? 0) + 1)
    expect(byGroup.size).toBe(12)
    for (const [, n] of byGroup) expect(n).toBe(4)
  })
  it('has 72 group matches (6 per group)', () => { expect(wc.groupMatches).toHaveLength(72) })
  it('has at least 31 knockout matches', () => { expect(wc.knockoutMatches.length).toBeGreaterThanOrEqual(31) })
  it('every group match references real team ids', () => {
    const ids = new Set(wc.teams.map((t) => t.id))
    for (const m of wc.groupMatches) { expect(ids.has(m.homeId)).toBe(true); expect(ids.has(m.awayId)).toBe(true) }
  })
})
