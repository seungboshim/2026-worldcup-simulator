import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import data from '../../data/worldcup-2026.json'
import type { Score, ScoreMap, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData

export function defaultScores(): ScoreMap {
  const map: ScoreMap = {}
  for (const m of wc.groupMatches) {
    map[m.id] =
      m.played && m.defaultHome !== null && m.defaultAway !== null
        ? { home: m.defaultHome, away: m.defaultAway }
        : null
  }
  return map
}

interface SimulatorState {
  scores: ScoreMap
  winners: Record<string, string | null>
  goldenBall: string
  goldenBoot: string
  setScore: (matchId: string, score: Score) => void
  setWinner: (matchId: string, teamId: string) => void
  setAward: (kind: 'ball' | 'boot', playerId: string) => void
  resetToDefault: () => void
  clearAll: () => void
}

export const useSimulator = create<SimulatorState>()(
  persist(
    (set) => ({
      scores: defaultScores(),
      winners: {},
      goldenBall: '',
      goldenBoot: '',
      setScore: (matchId, score) =>
        set((st) => ({ scores: { ...st.scores, [matchId]: score } })),
      setWinner: (matchId, teamId) =>
        set((st) => ({ winners: { ...st.winners, [matchId]: teamId } })),
      setAward: (kind, playerId) => set(kind === 'ball' ? { goldenBall: playerId } : { goldenBoot: playerId }),
      resetToDefault: () => set({ scores: defaultScores(), winners: {}, goldenBall: '', goldenBoot: '' }),
      clearAll: () => {
        const cleared: ScoreMap = {}
        for (const k of Object.keys(defaultScores())) cleared[k] = null
        set({ scores: cleared, winners: {}, goldenBall: '', goldenBoot: '' })
      },
    }),
    { name: 'worldcup-sim-2026' },
  ),
)
