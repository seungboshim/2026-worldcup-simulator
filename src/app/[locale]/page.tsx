import { Header } from '@/components/Header'
import { Simulator } from '@/components/Simulator'

export default function Home() {
  return (
    <main className="mx-auto min-w-0 max-w-7xl space-y-5 p-4 sm:p-6">
      <Header />
      <Simulator />
    </main>
  )
}
