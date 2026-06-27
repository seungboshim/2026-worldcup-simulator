'use client'
import { useEffect, useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { SCENARIO_TEAM } from '@/lib/king'
import { teamFlag, teamName } from '@/lib/teams'
import { getPlayers, playerName } from '@/lib/players'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const ORDER = ['R32', 'R16', 'QF', 'SF', 'F'] as const
const ROUND_KEY: Record<(typeof ORDER)[number], DictKey> = {
  R32: 'roundR32',
  R16: 'roundR16',
  QF: 'roundQF',
  SF: 'roundSF',
  F: 'roundF',
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-bold tracking-tight">{value}</div>
    </div>
  )
}

// 통계 페이지 상단: 내가 쓴 우승팀·골든볼·득점왕 + 대한민국이 어디까지 진출했는지 (localStorage 기준).
export function MyPicksSummary() {
  const { t, locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const ball = useSimulator((s) => s.goldenBall)
  const boot = useSimulator((s) => s.goldenBoot)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const bracket = selectResolvedBracket(scores, winners)
  const finalM = bracket.find((m) => m.round === 'F')
  const champ = finalM ? winners[finalM.id] ?? null : null
  if (!champ) return null // 우승팀까지 예측 안 했으면 표시 안 함

  const pool = getPlayers()
  const playerCard = (id: string) => {
    if (!id) return '—'
    const p = pool.find((x) => x.id === id)
    return p ? `${teamFlag(p.teamId)} ${playerName(id, locale)}` : playerName(id, locale)
  }

  // 대한민국이 토너먼트에서 도달한 가장 깊은 라운드.
  const korDeepest = bracket
    .filter((m) => m.homeTeamId === SCENARIO_TEAM || m.awayTeamId === SCENARIO_TEAM)
    .reduce((acc, m) => Math.max(acc, ORDER.indexOf(m.round)), -1)
  const koreaText =
    champ === SCENARIO_TEAM
      ? `${t('champion')} 🏆`
      : korDeepest < 0
        ? t('korGroupStage')
        : `${t(ROUND_KEY[ORDER[korDeepest]])} ${t('reachedSuffix')}`

  return (
    <div className="rounded-2xl border bg-accent/40 p-4">
      <h3 className="mb-3 text-sm font-bold">{t('myPicksTitle')}</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Card label={`🏆 ${t('myPicksChampion')}`} value={`${teamFlag(champ)} ${teamName(champ, locale)}`} />
        <Card label={`🏅 ${t('goldenBall')}`} value={playerCard(ball)} />
        <Card label={`🥇 ${t('awardTopScorer')}`} value={playerCard(boot)} />
        <Card label={`${teamFlag(SCENARIO_TEAM)} ${teamName(SCENARIO_TEAM, locale)}`} value={koreaText} />
      </div>
    </div>
  )
}
