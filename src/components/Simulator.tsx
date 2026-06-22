'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { GroupStage } from '@/components/group/GroupStage'
import { Bracket } from '@/components/knockout/Bracket'
import { ThirdPlaceAside, ThirdPlaceSheet } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/i18n/useT'

export function Simulator() {
  const { t } = useT()
  const [tab, setTab] = useState('group')
  const [sheetOpen, setSheetOpen] = useState(false)
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
          <ThirdPlaceAside />
        </div>

        {/* 하단 플로팅 바: [진출현황(모바일)] · [진행도 / 다음] */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center gap-2 pb-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="pointer-events-auto rounded-full border bg-background/90 px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur lg:hidden"
          >
            🥉 {t('qualStatusButton')}
          </button>
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

        <ThirdPlaceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </TabsContent>

      <TabsContent value="knockout">
        <Bracket />
      </TabsContent>
    </Tabs>
  )
}
