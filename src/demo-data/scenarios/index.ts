import type { DemoDataset, DemoScenarioId } from '../types'
import { buildHappyPathDataset } from './happyPath'
import { buildNewUserDataset } from './newUser'
import { buildAtCapDataset } from './atCap'
import { buildEdgeCaseDataset } from './edgeCase'
import { buildPowerUserDataset } from './powerUser'

const builders: Record<DemoScenarioId, () => DemoDataset> = {
  'happy-path': buildHappyPathDataset,
  'new-user': buildNewUserDataset,
  'at-cap': buildAtCapDataset,
  trial: buildHappyPathDataset, // same as happy-path; tier handled by auth
  premium: buildHappyPathDataset,
  'power-user': buildPowerUserDataset,
  'edge-case': buildEdgeCaseDataset,
}

export function buildScenarioDataset(id: DemoScenarioId): DemoDataset {
  const fn = builders[id] ?? builders['happy-path']
  return fn()
}

export { buildHappyPathDataset, buildNewUserDataset, buildAtCapDataset, buildEdgeCaseDataset, buildPowerUserDataset }
