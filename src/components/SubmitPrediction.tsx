'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { extractPrediction } from '@/lib/predict'
import { getBrowserId } from '@/lib/browser-id'
import { submitPrediction } from '@/app/actions/submit-prediction'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'

export function SubmitPrediction() {
  const { t } = useT()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const picks = extractPrediction(selectResolvedBracket(scores, winners), winners)

  if (!picks) {
    return <p className="text-center text-xs text-muted-foreground">{t('submitNeedsComplete')}</p>
  }

  // 제출 후 통계로 튕기지 않고 다음 단계(어워드 투표)로 스크롤.
  const onSubmit = async () => {
    setBusy(true)
    try {
      await submitPrediction(getBrowserId(), picks)
      setSubmitted(true)
      document.getElementById('awards-vote')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button onClick={onSubmit} disabled={busy} className="w-full">
      {submitted ? `✓ ${t('submitted')}` : `🗳️ ${t('submitPrediction')}`}
    </Button>
  )
}
