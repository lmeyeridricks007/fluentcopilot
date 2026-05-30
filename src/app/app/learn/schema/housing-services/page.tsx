import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { HousingServicesSchemaLessonClient } from './HousingServicesSchemaLessonClient'

export default function SchemaHousingServicesLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HousingServicesSchemaLessonClient />
    </Suspense>
  )
}
