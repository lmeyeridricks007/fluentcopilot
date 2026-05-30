import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { HealthDoctorSchemaLessonClient } from './HealthDoctorSchemaLessonClient'

export default function SchemaHealthDoctorLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HealthDoctorSchemaLessonClient />
    </Suspense>
  )
}
