import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { PlansSocialSchemaLessonClient } from './PlansSocialSchemaLessonClient'

export default function SchemaPlansSocialLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlansSocialSchemaLessonClient />
    </Suspense>
  )
}
