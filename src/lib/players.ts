import data from '../../data/players-2026.json'
import type { Locale } from '@/i18n/config'

export interface Player {
  id: string
  nameKo: string
  nameEn: string
  teamId: string
  position: 'GK' | 'DF' | 'MF' | 'FW'
}

const players = data as unknown as Player[]
const byId = new Map(players.map((p) => [p.id, p]))

export function getPlayers(): Player[] {
  return players
}

export function getPlayer(id?: string | null): Player | undefined {
  return id ? byId.get(id) : undefined
}

export function playerName(id: string | null | undefined, locale: Locale): string {
  const p = getPlayer(id)
  if (!p) return locale === 'en' ? 'TBD' : '미정'
  return locale === 'en' ? p.nameEn : p.nameKo
}

// 주어진 팀들의 선수 — 팀 → 이름 순 정렬.
export function playersOfTeams(pool: Player[], teamIds: string[]): Player[] {
  const set = new Set(teamIds)
  return pool
    .filter((p) => set.has(p.teamId))
    .sort((a, b) => a.teamId.localeCompare(b.teamId) || a.nameEn.localeCompare(b.nameEn))
}

// 골든볼 후보 = 4강 팀 선수 전체(전 포지션).
export function goldenBallCandidates(pool: Player[], sfTeamIds: string[]): Player[] {
  return playersOfTeams(pool, sfTeamIds)
}

// 골든부트 후보 = 8강 팀 선수 중 공격수·미드필더만.
export function goldenBootCandidates(pool: Player[], qfTeamIds: string[]): Player[] {
  return playersOfTeams(pool, qfTeamIds).filter((p) => p.position === 'FW' || p.position === 'MF')
}
