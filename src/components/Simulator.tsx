'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { GroupStage } from '@/components/group/GroupStage'
import { Bracket } from '@/components/knockout/Bracket'
import { ThirdPlaceAside, QualMorphBar } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/i18n/useT'

export function Simulator() {
  const { t } = useT()
  const [tab, setTab] = useState('group')
  const scores = useSimulator((s) => s.scores)
  const total = Object.keys(scores).length
  const filled = Object.values(scores).filter((v) => v != null).length
  const complete = total > 0 && filled >= total

  const changeTab = (v: string) => {
    setTab(v)
    window.scrollTo({ top: 0 })
  }

  return (
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsList>
        <TabsTrigger value="group">{t('tabGroup')}</TabsTrigger>
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
              onClick={() => changeTab('knockout')}
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
        <QualMorphBar complete={complete} filled={filled} total={total} onNext={() => changeTab('knockout')} />
      </TabsContent>

      <TabsContent value="knockout" className="min-w-0">
        <Bracket />
      </TabsContent>
    </Tabs>
  )
}
