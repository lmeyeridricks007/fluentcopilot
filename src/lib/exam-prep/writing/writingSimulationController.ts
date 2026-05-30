export type WritingSimulationAdvance = 'next_task' | 'session_report'

export function afterWritingTaskStored(taskIndex: number, totalTasks: number): WritingSimulationAdvance {
  return taskIndex + 1 >= totalTasks ? 'session_report' : 'next_task'
}
