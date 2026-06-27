'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { teamFlag, teamName, teamCode } from '@/lib/teams'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'

const TOTAL = 5 // 0=로고, 1=후크, 2=점수데모, 3=순위갈팡질팡, 4=조별/토너
const SHADOW_UP = '0 6px 18px rgba(34, 197, 94, 0.5)'
const SHADOW_DOWN = '0 6px 18px rgba(239, 68, 68, 0.5)'
const SHADOW_NONE = '0 0 0 0 rgba(0,0,0,0)'

// 울고있는 선수 — public/images/crying-player.png 있으면 사용, 없으면 😭 폴백(없을 때 자동 대체).
function CryingPlayer() {
  const [err, setErr] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  // 하이드레이션 전 발생한 404(onError 누락)도 잡기 위해 마운트 후 로드 상태 확인.
  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) setErr(true)
  }, [])
  if (err) return <div className="text-7xl">😭</div>
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      ref={ref}
      src="/images/crying-player.png"
      alt=""
      onError={() => setErr(true)}
      className="mx-auto w-full rounded-xl"
      draggable={false}
    />
  )
}

// 슬라이드2: 실제처럼 누르는 인터랙티브 데모 + 터치영역 점선 가이드(조별리그와 동일).
function DemoMatch() {
  const { t } = useT()
  const [s, setS] = useState({ home: 0, away: 0 }) // home=KOR
  const upd = (home: number, away: number) => setS({ home: Math.max(0, home), away: Math.max(0, away) })
  const korWin = s.home > s.away
  const ring = ' outline-dotted outline-2 outline-offset-2 outline-primary/60'

  return (
    <div className="rounded-xl border-2 border-primary bg-primary/[0.06] p-3 text-left">
      <div aria-hidden className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-[11px] font-semibold leading-tight text-primary">
        <span className="flex items-center justify-end gap-0.5">{t('guideScore')}<span className="text-sm leading-none">↓</span></span>
        <span className="flex flex-col items-center">{t('guideReset')}<span className="text-sm leading-none">↓</span></span>
        <span />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-base">
        <button type="button" onClick={() => upd(s.home + 1, s.away)} className={`flex min-w-0 items-center justify-end gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary${ring}`}>
          <span className="truncate">대한민국</span>
          <span className="text-lg leading-none">🇰🇷</span>
        </button>
        <button type="button" onClick={() => upd(0, 0)} className={`font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform hover:scale-105${ring}`}>
          {s.home}
          <span className="opacity-50"> : </span>
          {s.away}
        </button>
        <button type="button" onClick={() => upd(s.home, s.away + 1)} className="flex min-w-0 items-center justify-start gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary">
          <span className="text-lg leading-none">🇿🇦</span>
          <span className="truncate">남아공</span>
        </button>
      </div>
      <div className="mt-2 text-center text-sm font-bold">
        {korWin ? (
          <span className="text-primary">🇰🇷 {t('demoGood')}</span>
        ) : (
          <span className="text-muted-foreground">{t('demoTapHint')}</span>
        )}
      </div>
    </div>
  )
}

// 슬라이드3: 승무패가 눌리는 모션과 함께 대한민국이 32↔33을 오가는 자동 데모(순위 변동 shadow 포함).
function CutLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="h-px flex-1 bg-primary/40" />
      <span className="whitespace-nowrap text-[10px] font-extrabold text-primary">{label}</span>
      <span className="h-px flex-1 bg-primary/40" />
    </div>
  )
}

function WaverRow({ id, rank, kor, flash, locale, t }: { id: string; rank: number; kor: boolean; flash: 'up' | 'down' | null; locale: Locale; t: (k: DictKey) => string }) {
  return (
    <motion.div
      layout
      animate={{ boxShadow: kor ? (flash === 'up' ? SHADOW_UP : flash === 'down' ? SHADOW_DOWN : SHADOW_NONE) : SHADOW_NONE }}
      transition={{ layout: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }, boxShadow: { duration: 0.35 } }}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${kor ? 'border-primary bg-primary/10 font-bold' : 'bg-card'}`}
    >
      <span className="font-mona w-5 text-center text-xs tabular-nums text-muted-foreground">{rank}</span>
      <span className="text-base leading-none">{teamFlag(id)}</span>
      <span className="flex-1 truncate">{teamName(id, locale)}</span>
      <span className={`text-xs font-bold ${rank <= 32 ? 'text-primary' : 'text-red-500'}`}>{rank <= 32 ? t('qualifiedShort') : t('eliminatedShort')}</span>
    </motion.div>
  )
}

function StandingsWaverDemo() {
  const { t, locale } = useT()
  const [up, setUp] = useState(true)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    const id = setInterval(() => {
      setUp((p) => {
        const n = !p
        setFlash(n ? 'up' : 'down')
        window.setTimeout(() => setFlash(null), 1000)
        return n
      })
    }, 1900)
    return () => clearInterval(id)
  }, [])

  const rows = [
    { id: 'KOR', rank: up ? 32 : 33, kor: true },
    { id: 'SEN', rank: up ? 33 : 32, kor: false },
  ].sort((a, b) => a.rank - b.rank)

  return (
    <div className="text-left">
      {/* 원인: 실제 국가/전광판 UI가 자동으로 결과를 바꿈(이집트 1-0 ↔ 0-0) */}
      <div className="mb-3 rounded-xl border p-2.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
          <span className="flex min-w-0 items-center justify-end gap-1.5">
            <span className="truncate">{teamName('EGY', locale)}</span>
            <span className="text-base leading-none">{teamFlag('EGY')}</span>
          </span>
          <motion.span
            key={up ? 'a' : 'b'}
            initial={{ scale: 0.82 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          >
            {up ? 1 : 0}
            <span className="opacity-50"> : </span>
            0
          </motion.span>
          <span className="flex min-w-0 items-center justify-start gap-1.5">
            <span className="text-base leading-none">{teamFlag('IRN')}</span>
            <span className="truncate">{teamName('IRN', locale)}</span>
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <Fragment key={r.id}>
            {i === 1 && <CutLine label={t('cutShort')} />}
            <WaverRow {...r} flash={flash} locale={locale} t={t} />
          </Fragment>
        ))}
      </div>
    </div>
  )
}

// 슬라이드4: 토너먼트 시뮬 미리보기 — 8강→4강→우승 미니 브래킷(승자 강조).
function BracketBox({ id, win }: { id: string; win?: boolean }) {
  return (
    <div className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] ${win ? 'border-primary bg-primary/10 font-bold' : 'opacity-55'}`}>
      <span className="text-xs leading-none">{teamFlag(id)}</span>
      <span className="font-mona tabular-nums">{teamCode(id)}</span>
      {win && <span className="ml-auto text-primary">✓</span>}
    </div>
  )
}
function BracketPreview() {
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex flex-1 flex-col justify-around gap-3">
        <div className="space-y-1"><BracketBox id="BRA" win /><BracketBox id="FRA" /></div>
        <div className="space-y-1"><BracketBox id="ESP" /><BracketBox id="ARG" win /></div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1">
        <BracketBox id="BRA" win />
        <BracketBox id="ARG" />
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
        <span className="text-2xl leading-none">🏆</span>
        <span className="font-mona text-[11px] font-bold">{teamCode('BRA')}</span>
      </div>
    </div>
  )
}

function Slide({ icon, title, body, children }: { icon?: string; title: DictKey; body: DictKey; children?: React.ReactNode }) {
  const { t } = useT()
  return (
    <div className="flex w-full shrink-0 snap-center items-center justify-center p-6">
      <div className="w-full max-w-md px-2 text-center">
        {icon && <div className="text-5xl">{icon}</div>}
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{t(title)}</h2>
        <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">{t(body)}</p>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  )
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const trackRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const isLast = step === TOTAL - 1

  const scrollTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }
  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== step) setStep(i)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* 0: 로고 — 흰 폰트 가독성 위해 뒤에 검은 방사형 그래디언트 */}
        <div className="flex w-full shrink-0 snap-center items-center justify-center p-6">
          <div className="mx-auto w-full max-w-[520px] px-3 py-10" style={{ background: 'radial-gradient(ellipse 64% 48% at 50% 50%, rgba(0,0,0,0.82), rgba(0,0,0,0) 74%)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/landing-title.png" alt={t('appTitle')} className="mx-auto w-full max-w-[460px]" draggable={false} />
          </div>
        </div>

        {/* 1: 감정 후크 + 울고있는 선수 */}
        <div className="flex w-full shrink-0 snap-center items-center justify-center p-6">
          <div className="w-full max-w-md px-2 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight">{t('obHookTitle')}</h2>
            <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">{t('obHookBody')}</p>
            <div className="mt-8">
              <CryingPlayer />
            </div>
          </div>
        </div>

        {/* 2: 점수 누르기 데모 + 터치 가이드 */}
        <Slide icon="👆" title="ob2Title" body="ob2Body">
          <DemoMatch />
        </Slide>

        {/* 3: 32↔33 갈팡질팡 자동 데모 */}
        <Slide icon="🇰🇷" title="ob1Title" body="ob1Body">
          <StandingsWaverDemo />
        </Slide>

        {/* 4: 조별·토너먼트 시뮬도 + 브래킷 미리보기 */}
        <Slide icon="🏆" title="ob3Title" body="ob3Body">
          <BracketPreview />
        </Slide>
      </div>

      <div className="flex flex-col items-center gap-4 px-6 pb-10">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />
          ))}
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => scrollTo(step - 1)} className="px-5">
              {t('onboardingPrev')}
            </Button>
          )}
          <Button className="flex-1" onClick={() => (isLast ? onDone() : scrollTo(step + 1))}>
            {isLast ? t('onboardingStart') : t('onboardingNext')} →
          </Button>
        </div>
      </div>
    </div>
  )
}
