'use client'
import type { GroupId } from '@/types'
import { GroupCard } from './GroupCard'

const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function GroupStage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {GROUP_IDS.map((g) => (
        <GroupCard key={g} groupId={g} />
      ))}
    </div>
  )
}
