import { Header } from '@/components/Header'
import { GroupStage } from '@/components/group/GroupStage'
import { Bracket } from '@/components/knockout/Bracket'
import { ThirdPlacePanel } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <Header />
      <Tabs defaultValue="group">
        <TabsList>
          <TabsTrigger value="group">조별리그</TabsTrigger>
          <TabsTrigger value="knockout">토너먼트</TabsTrigger>
        </TabsList>
        <TabsContent value="group">
          <div className="flex gap-5">
            <div className="min-w-0 flex-1"><GroupStage /></div>
            <ThirdPlacePanel />
          </div>
        </TabsContent>
        <TabsContent value="knockout">
          <Bracket />
        </TabsContent>
      </Tabs>
    </main>
  )
}
