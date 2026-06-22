'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { GroupStage } from '@/components/group/GroupStage'
import { Bracket } from '@/components/knockout/Bracket'
import { ThirdPlacePanel } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/i18n/useT'

export function Simulator() {
  const { t } = useT()
  const [tab, setTab] = useState('group')
  const scores = useSimulator((s) => s.scores)
  const total = Object.keys(scores).length
  const filled = Object.values(scores).filter((v) => v != null).length
  const complete = total > 0 && filled >= total

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="group">{t('tabGroup')}</TabsTrigger>
        <TabsTrigger value="knockout" disabled={!complete}>
          {t('tabKnockout')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="group">
        <div className="flex gap-5 pb-24">
          <div className="min-w-0 flex-1">
            <GroupStage />
          </div>
          <ThirdPlacePanel />
        </div>

        {/* 하단 플로팅 바: 모든 경기 입력 전엔 진행도, 완료되면 '다음으로' */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
          {complete ? (
            <button
              type="button"
              onClick={() => setTab('knockout')}
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
      </TabsContent>

      <TabsContent value="knockout">
        <Bracket />
      </TabsContent>
    </Tabs>
  )
}
