'use client'
import { useRouter } from 'next/navigation'
import { Onboarding } from './Onboarding'
import { useT } from '@/i18n/useT'

export function Landing() {
  const router = useRouter()
  const { locale } = useT()
  // 온보딩 완료 → 킹우의수(메인) 탭으로 진입
  return <Onboarding onDone={() => router.push(`/${locale}/sim?tab=scenario`)} />
}
