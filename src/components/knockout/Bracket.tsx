'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import data from '../../../data/worldcup-2026.json'
import type { KnockoutRound, WorldCupData } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { bracketLayoutRank } from '@/lib/bracket-layout'
import { teamFlag, teamName } from '@/lib/teams'
import { BracketMatch } from './BracketMatch'
import { ChampionCelebration } from './ChampionCelebration'
import { SubmitPrediction } from '@/components/SubmitPrediction'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const wc = data as unknown as WorldCupData
// 트리 순서로 세로 정렬 — 같은 다음 라운드로 올라가는 두 경기가 인접하게(공식 대진표 레이아웃).
const LAYOUT_RANK = bracketLayoutRank(wc.knockoutMatches)
const ROUNDS: { round: KnockoutRound; labelKey: DictKey }[] = [
  { round: 'R32', labelKey: 'roundR32' }, { round: 'R16', labelKey: 'roundR16' },
  { round: 'QF', labelKey: 'roundQF' }, { round: 'SF', labelKey: 'roundSF' }, { round: 'F', labelKey: 'roundF' },
]

export function Bracket() {
  const { t, locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const all = selectResolvedBracket(scores, winners)
  const byId = new Map(all.map((m) => [m.id, m]))
  const finalMatch = wc.knockoutMatches.find((m) => m.round === 'F')
  const championId = finalMatch ? winners[finalMatch.id] ?? null : null

  // 우승팀이 새로 정해지면 잠깐 축하(컨페티+글로우). 같은 팀 재선택/되돌림엔 다시 안 터지게 ref로 추적.
  const [celebrate, setCelebrate] = useState(false)
  const prevChamp = useRef<string | null>(championId)
  useEffect(() => {
    if (championId && championId !== prevChamp.current) {
      setCelebrate(true)
      const id = setTimeout(() => setCelebrate(false), 2400)
      prevChamp.current = championId
      return () => clearTimeout(id)
    }
    prevChamp.current = championId
  }, [championId])

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      <AnimatePresence>{celebrate && championId && <ChampionCelebration championId={championId} locale={locale} />}</AnimatePresence>
      {ROUNDS.map(({ round, labelKey }) => {
        const matches = wc.knockoutMatches
          .filter((m) => m.round === round)
          .sort((a, b) => (LAYOUT_RANK.get(a.id) ?? 0) - (LAYOUT_RANK.get(b.id) ?? 0))
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
        <motion.div
          key={championId ?? 'none'}
          initial={championId ? { scale: 0.9 } : false}
          animate={
            championId
              ? { scale: 1, boxShadow: ['0 0 0 rgba(251,191,36,0)', '0 0 44px rgba(251,191,36,0.75)', '0 0 18px rgba(251,191,36,0.4)'] }
              : { boxShadow: '0 0 0 rgba(251,191,36,0)' }
          }
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`rounded-2xl border p-4 text-center ${championId ? 'border-amber-300 bg-amber-400/10' : 'border-primary bg-accent'}`}
        >
          <div className={`text-sm font-bold ${championId ? 'text-amber-500' : 'text-primary'}`}>🏆 {t('champion')}</div>
          <div className="mt-1.5 font-mona text-xl font-extrabold tracking-tight">{championId ? `${teamFlag(championId)} ${teamName(championId, locale)}` : t('undecided')}</div>
        </motion.div>
        <SubmitPrediction />
      </div>
    </div>
  )
}
