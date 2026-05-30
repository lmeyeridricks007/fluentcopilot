/**
 * Linear exam progression — no backward navigation in simulation.
 */

export function nextTaskIndex(current: number, taskCount: number): number | 'complete' {
  if (current + 1 >= taskCount) return 'complete'
  return current + 1
}

export function isLinearSimulationLocked(): boolean {
  return true
}
