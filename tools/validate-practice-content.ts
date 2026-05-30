/**
 * Validate Practice & Mastery JSON (scenarios, missions, session results) against Zod schemas.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts
 *   npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --scenario content/practice/samples/sample-scenario.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --mission path/to/mission.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --session-result path/to/result.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --all-samples
 *
 * Cross-checks (when validating a scenario):
 * - Unique ids for stages, personas, objectives, expectedSkills
 * - Unique turn ids within each stage's turnPlan
 * - objective.relatedExpectedSkills / relatedAbilities reference known ids in the scenario
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scenarioSchema, type Scenario } from '../src/lib/schemas/practice/scenario.schema'
import { missionSchema } from '../src/lib/schemas/practice/mission.schema'
import { practiceSessionResultSchema } from '../src/lib/schemas/practice/practiceSessionResult.schema'
import { scenarioCatalogBundleSchema } from '../src/lib/schemas/practice/scenarioCatalogEntry.schema'
import { guidedScenarioDefinitionSchema } from '../src/lib/schemas/practice/guidedScenarioDefinition.schema'
import { validateGuidedDefinition } from '../src/lib/practice/guided/validateGuidedDefinition'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DEFAULT_SAMPLES = join(ROOT, 'content/practice/samples')
const DEFAULT_CATALOG = join(ROOT, 'content/practice/catalog/scenarios.json')
const DEFAULT_GUIDED_DIR = join(ROOT, 'content/practice/guided/scenarios')

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function assertUniqueIds(label: string, ids: string[]): void {
  const seen = new Map<string, number>()
  for (const id of ids) {
    seen.set(id, (seen.get(id) ?? 0) + 1)
  }
  for (const [id, n] of seen) {
    if (n > 1) {
      console.error(`[validate-practice] ERROR: duplicate ${label} id: ${id} (${n}×)`)
      process.exitCode = 1
    }
  }
}

function validateScenarioRefs(scenario: Scenario): void {
  const skillIds = new Set(scenario.expectedSkills.map((s) => s.id))
  scenario.objectives.forEach((o) => {
    ;(o.relatedExpectedSkills ?? []).forEach((rid) => {
      if (!skillIds.has(rid)) {
        console.error(
          `[validate-practice] ERROR: objective ${o.id} references unknown expectedSkill id: ${rid}`
        )
        process.exitCode = 1
      }
    })
  })
  scenario.scenarioStages.forEach((st) => {
    st.turnPlan?.forEach((turn) => {
      const hits = turn.scoringHooks?.objectiveIdsHit
      hits?.forEach((oid) => {
        if (!scenario.objectives.some((o) => o.id === oid)) {
          console.warn(
            `[validate-practice] WARN: turn ${turn.id} scoringHooks.objectiveIdsHit references unknown objective: ${oid}`
          )
        }
      })
      const weights = turn.scoringHooks?.skillWeightById
      if (weights) {
        Object.keys(weights).forEach((sk) => {
          if (!skillIds.has(sk)) {
            console.warn(
              `[validate-practice] WARN: turn ${turn.id} scoringHooks.skillWeightById references unknown skill: ${sk}`
            )
          }
        })
      }
    })
  })
}

function validateScenarioTurnPlans(scenario: Scenario): void {
  for (const stage of scenario.scenarioStages) {
    const plan = stage.turnPlan
    if (!plan?.length) continue
    assertUniqueIds(
      `turn in stage ${stage.id}`,
      plan.map((t) => t.id)
    )
  }
}

function validateScenarioFile(path: string): boolean {
  if (!existsSync(path)) {
    console.error(`[validate-practice] ERROR: file not found: ${path}`)
    return false
  }
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-practice] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const parsed = scenarioSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`[validate-practice] ERROR: scenario schema: ${path}`)
    console.error(parsed.error.format())
    return false
  }
  const s = parsed.data
  assertUniqueIds(
    'scenarioStage',
    s.scenarioStages.map((x) => x.id)
  )
  assertUniqueIds(
    'persona',
    s.personas.map((x) => x.id)
  )
  assertUniqueIds(
    'objective',
    s.objectives.map((x) => x.id)
  )
  assertUniqueIds(
    'expectedSkill',
    s.expectedSkills.map((x) => x.id)
  )
  validateScenarioTurnPlans(s)
  validateScenarioRefs(s)
  console.log(`[validate-practice] OK scenario: ${path}`)
  return !process.exitCode
}

function validateMissionFile(path: string): boolean {
  if (!existsSync(path)) {
    console.error(`[validate-practice] ERROR: file not found: ${path}`)
    return false
  }
  const raw = readJson(path)
  const parsed = missionSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`[validate-practice] ERROR: mission schema: ${path}`)
    console.error(parsed.error.format())
    return false
  }
  console.log(`[validate-practice] OK mission: ${path}`)
  return true
}

function validateSessionResultFile(path: string): boolean {
  if (!existsSync(path)) {
    console.error(`[validate-practice] ERROR: file not found: ${path}`)
    return false
  }
  const raw = readJson(path)
  const parsed = practiceSessionResultSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`[validate-practice] ERROR: session result schema: ${path}`)
    console.error(parsed.error.format())
    return false
  }
  assertUniqueIds(
    'practiceTurnResult',
    parsed.data.turnResults.map((t) => t.id)
  )
  console.log(`[validate-practice] OK session result: ${path}`)
  return true
}

function validateCatalogFile(path: string): boolean {
  if (!existsSync(path)) {
    console.error(`[validate-practice] ERROR: file not found: ${path}`)
    return false
  }
  const raw = readJson(path)
  const parsed = scenarioCatalogBundleSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`[validate-practice] ERROR: scenario catalog bundle: ${path}`)
    console.error(parsed.error.format())
    return false
  }
  const ids = parsed.data.scenarios.map((s) => s.id)
  const seen = new Set(ids)
  if (seen.size !== ids.length) {
    console.error('[validate-practice] ERROR: duplicate scenario id in catalog bundle')
    return false
  }
  console.log(`[validate-practice] OK catalog: ${path}`)
  return true
}

function validateGuidedScenarioFile(path: string): boolean {
  if (!existsSync(path)) {
    console.error(`[validate-practice] ERROR: file not found: ${path}`)
    return false
  }
  const raw = readJson(path)
  const parsed = guidedScenarioDefinitionSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`[validate-practice] ERROR: guided scenario schema: ${path}`)
    console.error(parsed.error.format())
    return false
  }
  const issues = validateGuidedDefinition(parsed.data)
  if (issues.length) {
    for (const i of issues) {
      console.error(`[validate-practice] ERROR: ${path}: ${i.message}`)
    }
    return false
  }
  console.log(`[validate-practice] OK guided scenario: ${path}`)
  return true
}

function validateAllGuidedScenarios(): boolean {
  if (!existsSync(DEFAULT_GUIDED_DIR)) {
    console.warn(`[validate-practice] WARN: guided scenarios dir missing: ${DEFAULT_GUIDED_DIR}`)
    return true
  }
  let ok = true
  for (const name of readdirSync(DEFAULT_GUIDED_DIR)) {
    if (!name.endsWith('.json')) continue
    ok = validateGuidedScenarioFile(join(DEFAULT_GUIDED_DIR, name)) && ok
  }
  return ok
}

function validateAllSamples(): void {
  const scenario = join(DEFAULT_SAMPLES, 'sample-scenario.json')
  const mission = join(DEFAULT_SAMPLES, 'sample-mission.json')
  const session = join(DEFAULT_SAMPLES, 'sample-practice-session-result.json')
  let ok = true
  ok = validateScenarioFile(scenario) && ok
  ok = validateMissionFile(mission) && ok
  ok = validateSessionResultFile(session) && ok
  ok = validateCatalogFile(DEFAULT_CATALOG) && ok
  ok = validateAllGuidedScenarios() && ok
  if (!ok) process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.includes('--all-samples') || argv.length === 0) {
    validateAllSamples()
    return
  }
  const si = argv.indexOf('--scenario')
  const mi = argv.indexOf('--mission')
  const ri = argv.indexOf('--session-result')
  const ci = argv.indexOf('--catalog')
  const gi = argv.indexOf('--guided')
  if (si >= 0 && argv[si + 1]) {
    if (!validateScenarioFile(argv[si + 1]!)) process.exit(1)
    return
  }
  if (mi >= 0 && argv[mi + 1]) {
    if (!validateMissionFile(argv[mi + 1]!)) process.exit(1)
    return
  }
  if (ri >= 0 && argv[ri + 1]) {
    if (!validateSessionResultFile(argv[ri + 1]!)) process.exit(1)
    return
  }
  if (ci >= 0 && argv[ci + 1]) {
    if (!validateCatalogFile(argv[ci + 1]!)) process.exit(1)
    return
  }
  if (gi >= 0 && argv[gi + 1]) {
    if (!validateGuidedScenarioFile(argv[gi + 1]!)) process.exit(1)
    return
  }
  if (argv.includes('--all-guided')) {
    if (!validateAllGuidedScenarios()) process.exit(1)
    return
  }
  console.log(`Usage:
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts [--all-samples]
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --scenario <file>
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --mission <file>
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --session-result <file>
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --catalog <file>
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --guided <file>
  npx tsx --tsconfig tsconfig.json tools/validate-practice-content.ts --all-guided`)
}

main()
