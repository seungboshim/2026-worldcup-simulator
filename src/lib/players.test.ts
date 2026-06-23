import { it, expect } from 'vitest'
import players from '../../data/players-2026.json'
import wc from '../../data/worldcup-2026.json'
import { playersOfTeams, goldenBallCandidates, goldenBootCandidates, type Player } from './players'
import type { WorldCupData } from '@/types'

const list = players as unknown as Player[]
const teamIds = new Set((wc as unknown as WorldCupData).teams.map((t) => t.id))

it('every player has valid fields + real teamId + valid position + unique id', () => {
  const ids = new Set<string>()
  for (const p of list) {
    expect(p.id).toBeTruthy()
    expect(ids.has(p.id)).toBe(false)
    ids.add(p.id)
    expect(p.nameKo && p.nameEn).toBeTruthy()
    expect(teamIds.has(p.teamId)).toBe(true)
    expect(['GK', 'DF', 'MF', 'FW']).toContain(p.position)
  }
})

it('covers all 48 teams (>=1 player each)', () => {
  const covered = new Set(list.map((p) => p.teamId))
  expect(covered.size).toBe(48)
})

it('goldenBall = all players of given teams; goldenBoot = FW/MF only', () => {
  const sample: Player[] = [
    { id: 'A-1', nameKo: '가', nameEn: 'A1', teamId: 'A', position: 'FW' },
    { id: 'A-2', nameKo: '나', nameEn: 'A2', teamId: 'A', position: 'DF' },
    { id: 'B-1', nameKo: '다', nameEn: 'B1', teamId: 'B', position: 'MF' },
    { id: 'C-1', nameKo: '라', nameEn: 'C1', teamId: 'C', position: 'GK' },
  ]
  expect(playersOfTeams(sample, ['A']).map((p) => p.id).sort()).toEqual(['A-1', 'A-2'])
  expect(goldenBallCandidates(sample, ['A']).length).toBe(2)
  expect(goldenBootCandidates(sample, ['A', 'B', 'C']).map((p) => p.id).sort()).toEqual(['A-1', 'B-1'])
})
