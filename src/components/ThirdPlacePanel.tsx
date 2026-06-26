'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSimulator } from '@/store/useSimulator'
import { selectQualificationRanking } from '@/store/selectors'
import { analyzeScenario, SCENARIO_TEAM } from '@/lib/king'
import type { QualEntry } from '@/lib/standings'
import type { ScoreMap } from '@/types'
import { teamFlag, teamAbbr, teamName } from '@/lib/teams'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const tierKey = (tier: number): DictKey =>
  tier === 1 ? 'pos1' : tier === 2 ? 'pos2' : tier === 5 ? 'pos4' : 'pos3'

// 순위 변동 강조 그림자(경기 행과 동일): 상승=초록 / 하락=빨강 / 평상 = rest.
const SHADOW_UP = '0 8px 24px rgba(34, 197, 94, 0.45)'
const SHADOW_DOWN = '0 8px 24px rgba(239, 68, 68, 0.45)'
const flashShadow = (f: 'up' | 'down' | null | undefined, rest: string) =>
  f === 'up' ? SHADOW_UP : f === 'down' ? SHADOW_DOWN : rest

// 30·31·32등(버블) 경고 = 노랑 테두리 깜빡. flash(초록/빨강)가 있으면 flash가 우선(노랑에 안 가려짐).
const yellowBlink = (rest: string): string[] => [
  `0 0 0 1px rgba(250,204,21,0.12), ${rest}`,
  `0 0 0 3px rgba(250,204,21,0.95), ${rest}`,
  `0 0 0 1px rgba(250,204,21,0.12), ${rest}`,
]
const panelShadow = (flash: 'up' | 'down' | null | undefined, bubble: boolean | undefined, rest: string): string | string[] =>
  flash ? flashShadow(flash, rest) : bubble ? yellowBlink(rest) : rest
const panelShadowTrans = (flash: 'up' | 'down' | null | undefined, bubble: boolean | undefined) =>
  !flash && bubble ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' as const } : { duration: 0.35 }

function Row({ e, korFocus }: { e: QualEntry; korFocus?: boolean }) {
  const { t, locale } = useT()
  // 진출(1~32)은 동일하게, 미진출(33~48)만 흐림. 컷 라인이 경계를 표시.
  const tone = e.overall <= 32 ? '' : 'opacity-40'
  const isKor = korFocus && e.teamId === SCENARIO_TEAM
  const gd = e.gd > 0 ? `+${e.gd}` : `${e.gd}`
  return (
    <div className={`grid grid-cols-[22px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${tone} ${isKor ? 'bg-primary/10 font-bold !opacity-100 ring-1 ring-primary/40' : ''}`}>
      <span className="font-mona text-center text-xs leading-none tabular-nums text-muted-foreground">{e.overall}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span>{teamFlag(e.teamId)}</span>
        <span className="truncate">{teamAbbr(e.teamId, locale)}</span>
        <span className="font-mona text-[11px] text-muted-foreground">{e.groupId} {t(tierKey(e.tier))}</span>
      </span>
      <span className="font-mona text-xs tabular-nums text-muted-foreground">{e.points}pt {gd}</span>
    </div>
  )
}

function Toggle({ open, onClick, more, less, suffix, dir }: {
  open: boolean
  onClick: () => void
  more: DictKey
  less: DictKey
  suffix: DictKey
  dir: 'up' | 'down'
}) {
  const { t } = useT()
  const chevron = dir === 'up' ? (open ? '▾' : '▴') : open ? '▴' : '▾'
  return (
    <button
      type="button"
      onClick={onClick}
      className="my-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="leading-none">{chevron}</span>
      {open ? t(less) : t(more)}
      <span className="opacity-70">· {t(suffix)}</span>
    </button>
  )
}

// 시나리오 탭: 대한민국 현재 등수·진출여부·유리결과 충족(라이브, 모션).
function KorHeadline({ scores }: { scores: ScoreMap }) {
  const { t, locale } = useT()
  const a = useMemo(() => analyzeScenario(scores), [scores])
  if (!a.kor) return null
  const ok = a.kor.qualified
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-base">{teamFlag(SCENARIO_TEAM)}</span>
        <span className="text-lg font-bold tracking-tight">{teamName(SCENARIO_TEAM, locale)}</span>
        <motion.span key={a.kor.overall} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-mona text-lg font-extrabold tabular-nums">
          {t('korRankCurrent', { n: a.kor.overall })}
        </motion.span>
      </div>
      <div className={`mt-0.5 text-sm font-bold ${ok ? 'text-primary' : 'text-red-500'}`}>
        {ok ? t('korQualified') : t('korEliminated')}
        {a.pivotal > 0 && (
          <span className="ml-1.5 font-normal text-muted-foreground">· {t('favorableMet', { met: a.met, total: a.pivotal })}</span>
        )}
      </div>
    </div>
  )
}

// 모바일 접힌 알약용 KOR 등수 라벨.
function KorPill({ scores: scoresProp }: { scores?: ScoreMap }) {
  const { t, locale } = useT()
  const storeScores = useSimulator((s) => s.scores)
  const scores = scoresProp ?? storeScores
  const a = useMemo(() => analyzeScenario(scores), [scores])
  if (!a.kor) return <>{teamFlag(SCENARIO_TEAM)} {teamName(SCENARIO_TEAM, locale)}</>
  return (
    <span className={a.kor.qualified ? 'text-primary' : 'text-red-500'}>
      {teamFlag(SCENARIO_TEAM)} {teamName(SCENARIO_TEAM, locale)} {t('korRankCurrent', { n: a.kor.overall })}
    </span>
  )
}

export function QualPanelBody({ korFocus, scores: scoresProp }: { korFocus?: boolean; scores?: ScoreMap } = {}) {
  const { t } = useT()
  const storeScores = useSimulator((s) => s.scores)
  const scores = scoresProp ?? storeScores
  const [expandedTop, setExpandedTop] = useState(false)
  const [expandedBottom, setExpandedBottom] = useState(false)
  const all = selectQualificationRanking(scores)
  const auto = all.slice(0, 24) // 1~24 진출 확정
  const bubble = all.slice(24, 32) // 25~32 조 3위 막차
  const elim = all.slice(32, 36) // 33~36 미진출 조 3위
  const fourths = all.slice(36) // 37~48 조 4위

  return (
    <div>
      {korFocus ? <KorHeadline scores={scores} /> : <h2 className="mb-3 text-lg font-bold tracking-tight">{t('qualStatus')}</h2>}

      {/* 위쪽: 1~24위(진출 확정) 더보기 */}
      <Toggle open={expandedTop} onClick={() => setExpandedTop((v) => !v)} more="showRanksMore" less="showRanksLess" suffix="confirmedSuffix" dir="up" />
      {expandedTop && (
        <>
          {auto.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}
          <div className="my-2.5 h-px bg-border" />
        </>
      )}

      {bubble.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}

      <div className="my-3 flex items-center gap-2.5">
        <span className="h-0.5 flex-1 rounded bg-gradient-to-r from-transparent to-primary" />
        <span
          className="whitespace-nowrap text-xs font-extrabold text-primary"
          style={{ textShadow: '0 0 14px var(--accent-glow)' }}
        >
          {t('cutLabel')}
        </span>
        <span className="h-0.5 flex-1 rounded bg-gradient-to-l from-transparent to-primary" />
      </div>

      {elim.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}

      {/* 아래쪽: 37~48위(조 4위, 탈락) 더보기 */}
      <Toggle open={expandedBottom} onClick={() => setExpandedBottom((v) => !v)} more="showFourthMore" less="showFourthLess" suffix="eliminatedSuffix" dir="down" />
      {expandedBottom && fourths.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}
    </div>
  )
}

// 데스크탑: 우측 sticky 패널
export function ThirdPlaceAside({
  korFocus,
  scores,
  flash,
  bubble,
}: { korFocus?: boolean; scores?: ScoreMap; flash?: 'up' | 'down' | null; bubble?: boolean } = {}) {
  return (
    <motion.aside
      animate={{ boxShadow: panelShadow(flash, bubble, '0 0 0 0 rgba(0,0,0,0)') }}
      transition={{ boxShadow: panelShadowTrans(flash, bubble) }}
      className="sticky top-4 hidden h-fit w-[312px] shrink-0 rounded-2xl border p-4 lg:block"
    >
      <QualPanelBody korFocus={korFocus} scores={scores} />
    </motion.aside>
  )
}

// 모바일: 하단 알약 → 탭하면 시트로 "자라나는" 모프(motion layout). 예측 진행도 + 다음으로 CTA 내장.
export function QualMorphBar({
  complete,
  filled,
  total,
  onNext,
  korFocus,
  scores,
  flash,
  bubble,
}: {
  complete: boolean
  filled: number
  total: number
  onNext: () => void
  korFocus?: boolean
  scores?: ScoreMap
  flash?: 'up' | 'down' | null
  bubble?: boolean
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })

  const recomputeFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setFade({
      top: el.scrollTop > 4,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    recomputeFade()
    const ro = new ResizeObserver(recomputeFade)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [open, recomputeFade])

  return (
    <div className="lg:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
        <motion.div
          layout
          role={open ? 'dialog' : undefined}
          aria-modal={open || undefined}
          animate={{ boxShadow: panelShadow(flash, bubble, '0 25px 50px -12px rgba(0,0,0,0.35)') }}
          transition={{ layout: { duration: 0.42, ease: [0.16, 1, 0.3, 1] }, boxShadow: panelShadowTrans(flash, bubble) }}
          className={`overflow-hidden border ${
            open
              ? 'flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-background'
              : 'rounded-full bg-background/95 backdrop-blur'
          }`}
        >
          {open ? (
            <motion.div
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.12, duration: 0.28 }}
              className="flex min-h-0 flex-col"
            >
              <div className="flex shrink-0 justify-center pt-3 pb-1">
                <div className="h-1.5 w-10 rounded-full bg-border" />
              </div>

              {/* 스크롤 영역 + 양끝 fade gradient (스크롤 가능할 때만) */}
              <div className="relative min-h-0 flex-1">
                {fade.top && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
                )}
                <div ref={scrollRef} onScroll={recomputeFade} className="h-full overflow-y-auto px-4">
                  <QualPanelBody korFocus={korFocus} scores={scores} />
                </div>
                {fade.bottom && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 p-3">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  {t('qualClose')}
                </Button>
                {complete ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setOpen(false)
                      onNext()
                    }}
                  >
                    {t(korFocus ? 'scenarioToKnockout' : 'next')} →
                  </Button>
                ) : (
                  <span className="flex-1 text-center text-sm text-muted-foreground">
                    {t('predictedMatches')} <span className="font-mona tabular-nums">{filled}/{total}</span>
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            // 겉: 진출 현황(→시트) 알약, 그 안에 다음으로(→다음) 버튼을 감싼 모양. 클릭영역은 단순 병렬.
            <div className="flex items-center gap-5 py-1.5 pr-1.5 pl-5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"
              >
                {korFocus ? <KorPill scores={scores} /> : <>🥉 {t('qualStatusButton')}</>}
              </button>
              {/* 넓은 데스크탑 플로팅 버튼과 동일 스타일(크기만 작게): 미완료=어두운 알약, 완료=녹색 알약 */}
              {complete ? (
                <button
                  type="button"
                  onClick={() => onNext()}
                  className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
                >
                  {t(korFocus ? 'scenarioToKnockout' : 'next')} →
                </button>
              ) : (
                <span className="whitespace-nowrap rounded-full bg-foreground/85 px-4 py-2 text-sm font-semibold text-background">
                  {t('predictedMatches')} <span className="font-mona tabular-nums">{filled}/{total}</span>
                </span>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
