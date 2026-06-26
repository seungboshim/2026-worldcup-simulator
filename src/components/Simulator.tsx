'use client'
import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSimulator, defaultScores } from '@/store/useSimulator'
import { matchday3Matches } from '@/lib/king'
import type { Score, ScoreMap } from '@/types'
import { GroupStage } from '@/components/group/GroupStage'
import { ScenarioBoard } from '@/components/scenario/ScenarioBoard'
import { Bracket } from '@/components/knockout/Bracket'
import { AwardsVote } from '@/components/AwardsVote'
import { ThirdPlaceAside, QualMorphBar } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/i18n/useT'

type Tab = 'group' | 'scenario' | 'knockout'

export function Simulator() {
  const { t } = useT()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const scores = useSimulator((s) => s.scores)
  const total = Object.keys(scores).length
  const filled = Object.values(scores).filter((v) => v != null).length
  const complete = total > 0 && filled >= total

  // 킹우의수: 영속 store와 독립. 진입(마운트=페이지 로드) 시 원본 데이터로 시작.
  const [scenarioScores, setScenarioScores] = useState<ScoreMap>(defaultScores)
  const setScenarioScore = useCallback(
    (id: string, sc: Score) => setScenarioScores((prev) => ({ ...prev, [id]: sc })),
    [],
  )
  const md3Ids = useMemo(() => matchday3Matches().map((m) => m.id), [])
  const scTotal = md3Ids.length
  const scFilled = md3Ids.filter((id) => scenarioScores[id] != null).length
  const scComplete = scFilled === scTotal

  const urlTab = params.get('tab')
  const wanted: Tab = urlTab === 'scenario' || urlTab === 'knockout' || urlTab === 'group' ? urlTab : 'group'
  const initial: Tab = wanted === 'knockout' && !complete ? 'group' : wanted
  const [tab, setTab] = useState<Tab>(initial)

  const changeTab = (v: string) => {
    setTab(v as Tab)
    router.replace(`${pathname}?tab=${v}`, { scroll: false })
    window.scrollTo({ top: 0 })
  }

  // 다 예측 후 토너먼트로 갈 때만 시나리오 점수를 store(=localStorage)에 저장.
  const goKnockout = () => {
    useSimulator.setState({ scores: scenarioScores })
    changeTab('knockout')
  }

  return (
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsList>
        <TabsTrigger value="group">{t('tabGroup')}</TabsTrigger>
        <TabsTrigger value="scenario">{t('tabScenario')}</TabsTrigger>
        <TabsTrigger value="knockout" disabled={!complete}>
          {t('tabKnockout')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="group" className="min-w-0">
        <div className="flex gap-5 pb-24">
          <div className="min-w-0 flex-1">
            <GroupStage />
          </div>
          <ThirdPlaceAside />
        </div>

        {/* 데스크탑: 진행도/다음 플로팅 (우측 패널이 늘 떠 있으므로 CTA만) */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden justify-center pb-4 lg:flex">
          {complete ? (
            <button
              type="button"
              onClick={() => changeTab('scenario')}
              className="pointer-events-auto rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
            >
              {t('next')} →
            </button>
          ) : (
            <div className="pointer-events-auto rounded-full bg-foreground/85 px-6 py-3 text-sm font-semibold text-background shadow-lg backdrop-blur">
              {t('predictedMatches')} <span className="font-mona tabular-nums">{filled}/{total}</span>
            </div>
          )}
        </div>

        {/* 모바일: 진출현황 알약 → 시트로 모프(진행도/다음 CTA 내장) */}
        <QualMorphBar complete={complete} filled={filled} total={total} onNext={() => changeTab('scenario')} />
      </TabsContent>

      <TabsContent value="scenario" className="min-w-0">
        <ScenarioBoard
          scores={scenarioScores}
          onScore={setScenarioScore}
          complete={scComplete}
          filled={scFilled}
          total={scTotal}
          onNext={goKnockout}
        />
      </TabsContent>

      <TabsContent value="knockout" className="min-w-0">
        <Bracket />
        <AwardsVote />
      </TabsContent>
    </Tabs>
  )
}
