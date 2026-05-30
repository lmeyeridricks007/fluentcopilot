import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { GovernmentAdministrationSchemaLessonClient } from './GovernmentAdministrationSchemaLessonClient'

export default function SchemaGovernmentAdministrationLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GovernmentAdministrationSchemaLessonClient />
    </Suspense>
  )
}
