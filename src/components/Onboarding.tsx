'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const TOTAL = 4 // 0=로고, 1·2·3=슬라이드(2=인터랙티브 데모)

// 가이드용 미니 데모: 실제처럼 국가/전광판을 눌러 점수를 바꾸면 KOR 유불리가 보인다(스토어와 무관, 로컬).
function DemoMatch() {
  const { t } = useT()
  const [s, setS] = useState({ home: 0, away: 0 }) // home=KOR, away=RSA
  const upd = (home: number, away: number) => setS({ home: Math.max(0, home), away: Math.max(0, away) })
  const korWin = s.home > s.away

  return (
    <div className="rounded-xl border-2 border-primary bg-primary/[0.06] p-3 text-left">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-base">
        <button
          type="button"
          onClick={() => upd(s.home + 1, s.away)}
          className="flex min-w-0 items-center justify-end gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary"
        >
          <span className="truncate">대한민국</span>
          <span className="text-lg leading-none">🇰🇷</span>
        </button>
        <button
          type="button"
          onClick={() => upd(0, 0)}
          className="font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform hover:scale-105"
        >
          {s.home}
          <span className="opacity-50"> : </span>
          {s.away}
        </button>
        <button
          type="button"
          onClick={() => upd(s.home, s.away + 1)}
          className="flex min-w-0 items-center justify-start gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary"
        >
          <span className="text-lg leading-none">🇿🇦</span>
          <span className="truncate">남아공</span>
        </button>
      </div>
      <div className="mt-2 text-center text-sm font-bold">
        {korWin ? (
          <span className="text-primary">🇰🇷 {t('decisiveTag')} · {t('demoGood')}</span>
        ) : (
          <span className="text-muted-foreground">{t('demoTapHint')}</span>
        )}
      </div>
    </div>
  )
}

function Slide({ icon, title, body, children }: { icon: string; title: DictKey; body: DictKey; children?: React.ReactNode }) {
  const { t } = useT()
  return (
    <div className="flex w-full shrink-0 snap-center items-center justify-center p-6">
      <div className="w-full max-w-md px-2 text-center">
        <div className="text-5xl">{icon}</div>
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
          <div
            className="mx-auto w-full max-w-[460px] p-10"
            style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(0,0,0,0.62), rgba(0,0,0,0) 72%)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/landing-title.png" alt={t('appTitle')} className="mx-auto w-full max-w-[360px]" draggable={false} />
          </div>
        </div>

        {/* 1 */}
        <Slide icon="🇰🇷" title="ob1Title" body="ob1Body" />

        {/* 2: 인터랙티브 데모 */}
        <Slide icon="👆" title="ob2Title" body="ob2Body">
          <DemoMatch />
        </Slide>

        {/* 3 */}
        <Slide icon="🏆" title="ob3Title" body="ob3Body" />
      </div>

      <div className="flex flex-col items-center gap-4 px-6 pb-10">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
            />
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
