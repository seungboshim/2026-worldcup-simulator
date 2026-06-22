'use client'
import data from '../../../data/worldcup-2026.json'
import thirdAssign from '../../../data/third-place-assignment.json'
import type { KnockoutRound, ThirdPlaceAssignmentTable, WorldCupData } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { selectGroupStandings, selectThirdPlaceRanking } from '@/store/selectors'
import { seedKnockout, advanceBracket } from '@/lib/knockout'
import { teamFlag, teamName } from '@/lib/teams'
import { BracketMatch } from './BracketMatch'

const wc = data as unknown as WorldCupData
const assignment = thirdAssign as unknown as ThirdPlaceAssignmentTable
const ROUNDS: { round: KnockoutRound; label: string }[] = [
  { round: 'R32', label: '32강' }, { round: 'R16', label: '16강' },
  { round: 'QF', label: '8강' }, { round: 'SF', label: '4강' }, { round: 'F', label: '결승' },
]

export function Bracket() {
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const standings = selectGroupStandings(scores)
  const thirds = selectThirdPlaceRanking(scores)
  const r32 = seedKnockout(wc.knockoutMatches, standings, thirds, assignment)
  const all = advanceBracket(wc.knockoutMatches, r32, winners)
  const byId = new Map(all.map((m) => [m.id, m]))
  const finalMatch = wc.knockoutMatches.find((m) => m.round === 'F')
  const championId = finalMatch ? winners[finalMatch.id] ?? null : null

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {ROUNDS.map(({ round, label }) => {
        const matches = wc.knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.order - b.order)
        return (
          <div key={round} className="flex min-w-[190px] flex-col">
            <h3 className="mb-3.5 text-sm font-bold">{label} <span className="font-normal text-muted-foreground">· {matches.length}경기</span></h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches.map((m) => {
                const resolved = byId.get(m.id)
                return resolved ? <BracketMatch key={m.id} match={resolved} /> : null
              })}
            </div>
          </div>
        )
      })}
      <div className="flex min-w-[204px] flex-col justify-center gap-3.5">
        <div className="rounded-2xl border border-primary bg-accent p-4 text-center">
          <div className="text-sm font-bold text-primary">🏆 우승</div>
          <div className="mt-1.5 font-mona text-xl font-extrabold tracking-tight">{championId ? `${teamFlag(championId)} ${teamName(championId)}` : '— 미정 —'}</div>
        </div>
        <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          <span className="rounded border border-primary px-1.5 py-0.5 text-[11px] font-bold text-primary">다음 단계</span>
          <p className="mt-2"><b className="text-foreground">골든볼 · 골든슈</b> 투표는 토너먼트 종료 후 추가됩니다.</p>
        </div>
      </div>
    </div>
  )
}
