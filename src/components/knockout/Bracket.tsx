'use client'
import data from '../../../data/worldcup-2026.json'
import thirdAssign from '../../../data/third-place-assignment.json'
import type { KnockoutRound, ThirdPlaceAssignmentTable, WorldCupData } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { selectGroupStandings, selectThirdPlaceRanking } from '@/store/selectors'
import { seedKnockout, advanceBracket } from '@/lib/knockout'
import { teamFlag, teamName } from '@/lib/teams'
import { BracketMatch } from './BracketMatch'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const wc = data as unknown as WorldCupData
const assignment = thirdAssign as unknown as ThirdPlaceAssignmentTable
const ROUNDS: { round: KnockoutRound; labelKey: DictKey }[] = [
  { round: 'R32', labelKey: 'roundR32' }, { round: 'R16', labelKey: 'roundR16' },
  { round: 'QF', labelKey: 'roundQF' }, { round: 'SF', labelKey: 'roundSF' }, { round: 'F', labelKey: 'roundF' },
]

export function Bracket() {
  const { t, locale } = useT()
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
      {ROUNDS.map(({ round, labelKey }) => {
        const matches = wc.knockoutMatches.filter((m) => m.round === round).sort((a, b) => a.order - b.order)
        return (
          <div key={round} className="flex min-w-[190px] flex-col">
            <h3 className="mb-3.5 text-sm font-bold">{t(labelKey)} <span className="font-normal text-muted-foreground">· {t('roundMatches', { n: matches.length })}</span></h3>
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
          <div className="text-sm font-bold text-primary">🏆 {t('champion')}</div>
          <div className="mt-1.5 font-mona text-xl font-extrabold tracking-tight">{championId ? `${teamFlag(championId)} ${teamName(championId, locale)}` : t('undecided')}</div>
        </div>
        <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          <span className="rounded border border-primary px-1.5 py-0.5 text-[11px] font-bold text-primary">{t('nextPhaseTag')}</span>
          <p className="mt-2">{t('awardsNote')}</p>
        </div>
      </div>
    </div>
  )
}
