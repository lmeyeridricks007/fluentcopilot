import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { UnexpectedSituationsProblemSolvingSchemaLessonClient } from './UnexpectedSituationsProblemSolvingSchemaLessonClient'

export default function SchemaUnexpectedSituationsProblemSolvingLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <UnexpectedSituationsProblemSolvingSchemaLessonClient />
    </Suspense>
  )
}
