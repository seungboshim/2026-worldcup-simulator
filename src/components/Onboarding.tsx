'use client'
import { useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const SLIDES: { icon: string; title: DictKey; body: DictKey }[] = [
  { icon: '🇰🇷', title: 'ob1Title', body: 'ob1Body' },
  { icon: '👆', title: 'ob2Title', body: 'ob2Body' },
  { icon: '🏆', title: 'ob3Title', body: 'ob3Body' },
]
const TOTAL = SLIDES.length + 1 // 0 = 로고

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const isLast = step === TOTAL - 1

  const go = (next: number) => {
    if (next < 0 || next > TOTAL - 1) return
    setDir(next > step ? 1 : -1)
    setStep(next)
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(step + 1)
    else if (info.offset.x > 60) go(step - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: dir * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -48 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md select-none text-center"
          >
            {step === 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/landing-title.png" alt={t('appTitle')} className="mx-auto w-full max-w-[360px]" draggable={false} />
            ) : (
              <div className="px-2">
                <div className="text-5xl">{SLIDES[step - 1].icon}</div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{t(SLIDES[step - 1].title)}</h2>
                <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">{t(SLIDES[step - 1].body)}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-4 px-6 pb-10">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
            />
          ))}
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => go(step - 1)} className="px-5">
              {t('onboardingPrev')}
            </Button>
          )}
          <Button className="flex-1" onClick={() => (isLast ? onDone() : go(step + 1))}>
            {isLast ? t('onboardingStart') : t('onboardingNext')} →
          </Button>
        </div>
      </div>
    </div>
  )
}
