import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import data from '../../data/worldcup-2026.json'
import type { Score, ScoreMap, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData

function defaultScores(): ScoreMap {
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
  setScore: (matchId: string, score: Score) => void
  setWinner: (matchId: string, teamId: string) => void
  resetToDefault: () => void
  clearAll: () => void
}

export const useSimulator = create<SimulatorState>()(
  persist(
    (set) => ({
      scores: defaultScores(),
      winners: {},
      setScore: (matchId, score) =>
        set((st) => ({ scores: { ...st.scores, [matchId]: score } })),
      setWinner: (matchId, teamId) =>
        set((st) => ({ winners: { ...st.winners, [matchId]: teamId } })),
      resetToDefault: () => set({ scores: defaultScores(), winners: {} }),
      clearAll: () => {
        const cleared: ScoreMap = {}
        for (const k of Object.keys(defaultScores())) cleared[k] = null
        set({ scores: cleared, winners: {} })
      },
    }),
    { name: 'worldcup-sim-2026' },
  ),
)
