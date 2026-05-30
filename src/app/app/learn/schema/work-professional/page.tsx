import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { WorkProfessionalSchemaLessonClient } from './WorkProfessionalSchemaLessonClient'

export default function SchemaWorkProfessionalLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WorkProfessionalSchemaLessonClient />
    </Suspense>
  )
}
