import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { PeopleDailySchemaLessonClient } from './PeopleDailySchemaLessonClient'

export default function SchemaPeopleDailyLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PeopleDailySchemaLessonClient />
    </Suspense>
  )
}
