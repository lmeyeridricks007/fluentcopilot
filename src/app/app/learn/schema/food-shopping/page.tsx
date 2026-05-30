import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { FoodShoppingSchemaLessonClient } from './FoodShoppingSchemaLessonClient'

export default function SchemaFoodShoppingLessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <FoodShoppingSchemaLessonClient />
    </Suspense>
  )
}
