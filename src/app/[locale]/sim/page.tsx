import { Suspense } from 'react'
import { Simulator } from '@/components/Simulator'

export default function SimPage() {
  return (
    <Suspense>
      <Simulator />
    </Suspense>
  )
}
