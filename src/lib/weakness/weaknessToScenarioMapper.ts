import type { WeaknessCategoryDefinition } from '@/lib/weakness/types'
import type { DemoScenario } from '@/demo-data/types'

export function resolveScenarioTargets(
  def: WeaknessCategoryDefinition,
  scenarios: DemoScenario[]
): DemoScenario[] {
  const byId = new Map(scenarios.map((s) => [s.id, s]))
  const out: DemoScenario[] = []
  for (const id of def.scenarioIds) {
    const s = byId.get(id)
    if (s) out.push(s)
  }
  return out
}
