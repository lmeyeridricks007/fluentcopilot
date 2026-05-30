import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { LeisureCultureConversationsSchemaLessonClient } from './LeisureCultureConversationsSchemaLessonClient'

export default function SchemaLeisureCultureConversationsLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LeisureCultureConversationsSchemaLessonClient />
    </Suspense>
  )
}
