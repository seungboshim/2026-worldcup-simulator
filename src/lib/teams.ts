import data from '../../data/worldcup-2026.json'
import type { Team, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData
const byId = new Map(wc.teams.map((t) => [t.id, t]))

export function getTeam(id?: string | null): Team | undefined {
  return id ? byId.get(id) : undefined
}

export function teamName(id?: string | null): string {
  return getTeam(id)?.name ?? '미정'
}

export function teamFlag(id?: string | null): string {
  const code = getTeam(id)?.flagCode
  if (!code) return '🏳️'
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}
