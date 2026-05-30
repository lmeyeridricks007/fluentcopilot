import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { TransportGettingAroundSchemaLessonClient } from './TransportGettingAroundSchemaLessonClient'

export default function SchemaTransportGettingAroundLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TransportGettingAroundSchemaLessonClient />
    </Suspense>
  )
}
