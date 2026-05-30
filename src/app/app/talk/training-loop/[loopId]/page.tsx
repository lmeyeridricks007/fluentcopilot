import { TrainingLoopDrillPage } from '@/features/training-loop/TrainingLoopDrillPage'

export default async function Page({ params }: { params: Promise<{ loopId: string }> }) {
  const { loopId } = await params
  return <TrainingLoopDrillPage loopId={loopId} />
}
