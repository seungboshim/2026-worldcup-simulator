import data from '../../data/worldcup-2026.json'
import type { Team, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData
const byId = new Map(wc.teams.map((t) => [t.id, t]))

// ISO2('gb')로는 잉글랜드/스코틀랜드/웨일스를 구분할 수 없어 유니코드 subdivision 국기로 매핑.
const SUBDIVISION_FLAGS: Record<string, string> = {
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

export function getTeam(id?: string | null): Team | undefined {
  return id ? byId.get(id) : undefined
}

export function teamName(id?: string | null): string {
  return getTeam(id)?.name ?? '미정'
}

export function teamFlag(id?: string | null): string {
  const team = getTeam(id)
  if (!team) return '🏳️'
  if (SUBDIVISION_FLAGS[team.id]) return SUBDIVISION_FLAGS[team.id]
  return team.flagCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}
