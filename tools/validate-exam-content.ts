/**
 * Validate Exam Prep JSON against Zod schemas + light cross-reference checks.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --all-samples
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --exercise path/to/exercise.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --attempt path/to/attempt.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --session path/to/session.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --summary path/to/summary.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --module path/to/module.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-exam-content.ts --rubric path/to/rubric.json
 *
 * npm run validate-exam
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { examExerciseSchema } from '../src/lib/schemas/exam/examExercise.schema'
import { examAttemptSchema } from '../src/lib/schemas/exam/examAttempt.schema'
import { examSessionSchema } from '../src/lib/schemas/exam/examSession.schema'
import { examResultSummarySchema } from '../src/lib/schemas/exam/examResultSummary.schema'
import { examModuleSchema } from '../src/lib/schemas/exam/examModule.schema'
import { rubricDefinitionSchema } from '../src/lib/schemas/exam/rubricDefinition.schema'
import { modelAnswerSchema } from '../src/lib/schemas/exam/modelAnswer.schema'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SAMPLES = join(ROOT, 'content/exam/samples')

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
      console.error(`[validate-exam] ERROR: duplicate ${label} id: ${id} (${n}×)`)
      process.exitCode = 1
    }
  }
}

function validateExerciseFile(path: string): boolean {
  if (!existsSync(path)) {
    console.error(`[validate-exam] ERROR: file not found: ${path}`)
    return false
  }
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = examExerciseSchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: exam exercise: ${path}`)
    console.error(p.error.format())
    return false
  }
  console.log(`[validate-exam] OK exercise: ${path}`)
  return true
}

function validateAttemptFile(path: string): boolean {
  if (!existsSync(path)) return false
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = examAttemptSchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: exam attempt: ${path}`)
    console.error(p.error.format())
    return false
  }
  const a = p.data
  if (a.scoringResult) {
    if (a.scoringResult.examAttemptId !== a.id) {
      console.error(
        `[validate-exam] ERROR: scoringResult.examAttemptId (${a.scoringResult.examAttemptId}) !== attempt.id (${a.id})`
      )
      process.exitCode = 1
      return false
    }
    if (a.scoringResult.examExerciseId !== a.examExerciseId) {
      console.error(`[validate-exam] ERROR: scoringResult.examExerciseId mismatch`)
      process.exitCode = 1
      return false
    }
  }
  console.log(`[validate-exam] OK attempt: ${path}`)
  return true
}

function validateSessionFile(path: string): boolean {
  if (!existsSync(path)) return false
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = examSessionSchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: exam session: ${path}`)
    console.error(p.error.format())
    return false
  }
  console.log(`[validate-exam] OK session: ${path}`)
  return true
}

function validateSummaryFile(path: string): boolean {
  if (!existsSync(path)) return false
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = examResultSummarySchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: exam result summary: ${path}`)
    console.error(p.error.format())
    return false
  }
  console.log(`[validate-exam] OK result summary: ${path}`)
  return true
}

function validateModuleFile(path: string): boolean {
  if (!existsSync(path)) return false
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = examModuleSchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: exam module: ${path}`)
    console.error(p.error.format())
    return false
  }
  const m = p.data
  assertUniqueIds('examModule.section', m.sections?.map((s) => s.id) ?? [])
  const fromSections = new Set(m.sections?.flatMap((s) => s.exerciseIds) ?? [])
  const fromRefs = new Set(m.exerciseRefs)
  for (const id of fromRefs) {
    if (m.sections?.length && !fromSections.has(id)) {
      console.warn(`[validate-exam] WARN: exerciseRef ${id} not listed in any section.exerciseIds`)
    }
  }
  for (const id of fromSections) {
    if (!fromRefs.has(id)) {
      console.warn(`[validate-exam] WARN: section exerciseId ${id} missing from exerciseRefs`)
    }
  }
  console.log(`[validate-exam] OK module: ${path}`)
  return true
}

function validateRubricFile(path: string): boolean {
  if (!existsSync(path)) return false
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = rubricDefinitionSchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: rubric definition: ${path}`)
    console.error(p.error.format())
    return false
  }
  const r = p.data
  const sumMax = r.categories.reduce((acc, c) => acc + c.maxPoints, 0)
  if (Math.abs(sumMax - r.totalMaxPoints) > 0.001) {
    console.warn(
      `[validate-exam] WARN: rubric ${r.id} sum(category.maxPoints)=${sumMax} vs totalMaxPoints=${r.totalMaxPoints}`
    )
  }
  console.log(`[validate-exam] OK rubric: ${path}`)
  return true
}

function validateModelAnswerFile(path: string): boolean {
  if (!existsSync(path)) return false
  let raw: unknown
  try {
    raw = readJson(path)
  } catch (e) {
    console.error(`[validate-exam] ERROR: invalid JSON: ${path}`, e)
    return false
  }
  const p = modelAnswerSchema.safeParse(raw)
  if (!p.success) {
    console.error(`[validate-exam] ERROR: model answer: ${path}`)
    console.error(p.error.format())
    return false
  }
  console.log(`[validate-exam] OK model answer: ${path}`)
  return true
}

function crossCheckSamplesDir(): boolean {
  const exercises = new Map<string, string>()
  const attempts = new Map<string, { id: string; examExerciseId: string }>()
  let ok = true

  const exerciseFiles = [
    join(SAMPLES, 'sample-speaking-exercise.json'),
    join(SAMPLES, 'sample-writing-exercise.json'),
  ]
  for (const f of exerciseFiles) {
    if (!existsSync(f)) continue
    const p = examExerciseSchema.safeParse(readJson(f))
    if (!p.success) {
      ok = false
      continue
    }
    exercises.set(p.data.id, f)
  }

  const attemptFiles = [
    join(SAMPLES, 'sample-speaking-attempt.json'),
    join(SAMPLES, 'sample-writing-attempt.json'),
  ]
  for (const f of attemptFiles) {
    if (!existsSync(f)) continue
    const p = examAttemptSchema.safeParse(readJson(f))
    if (!p.success) {
      ok = false
      continue
    }
    attempts.set(p.data.id, { id: p.data.id, examExerciseId: p.data.examExerciseId })
    if (!exercises.has(p.data.examExerciseId)) {
      console.error(
        `[validate-exam] ERROR: attempt ${p.data.id} references unknown examExerciseId: ${p.data.examExerciseId}`
      )
      ok = false
      process.exitCode = 1
    }
  }

  const sessionPath = join(SAMPLES, 'sample-exam-session.json')
  if (existsSync(sessionPath)) {
    const sp = examSessionSchema.safeParse(readJson(sessionPath))
    if (sp.success) {
      for (const exId of sp.data.exerciseRefs) {
        if (!exercises.has(exId)) {
          console.error(`[validate-exam] ERROR: session references unknown exercise: ${exId}`)
          ok = false
          process.exitCode = 1
        }
      }
      for (const attId of sp.data.attemptRefs) {
        if (!attempts.has(attId)) {
          console.error(`[validate-exam] ERROR: session references unknown attempt: ${attId}`)
          ok = false
          process.exitCode = 1
        }
      }
      if (sp.data.resultSummaryId) {
        const sumPath = join(SAMPLES, 'sample-exam-result-summary.json')
        if (existsSync(sumPath)) {
          const rp = examResultSummarySchema.safeParse(readJson(sumPath))
          if (rp.success && rp.data.examSessionId !== sp.data.id) {
            console.error(`[validate-exam] ERROR: summary.examSessionId !== session.id`)
            ok = false
            process.exitCode = 1
          }
          if (rp.success && rp.data.id !== sp.data.resultSummaryId) {
            console.error(`[validate-exam] ERROR: summary.id !== session.resultSummaryId`)
            ok = false
            process.exitCode = 1
          }
        }
      }
    }
  }

  const modulePath = join(SAMPLES, 'sample-exam-module.json')
  if (existsSync(modulePath) && existsSync(sessionPath)) {
    const mod = examModuleSchema.safeParse(readJson(modulePath))
    const ses = examSessionSchema.safeParse(readJson(sessionPath))
    if (mod.success && ses.success && ses.data.examModuleId) {
      if (mod.data.id !== ses.data.examModuleId) {
        console.error(`[validate-exam] ERROR: session.examModuleId does not match module.id`)
        ok = false
        process.exitCode = 1
      }
      for (const exId of ses.data.exerciseRefs) {
        if (!mod.data.exerciseRefs.includes(exId)) {
          console.error(
            `[validate-exam] ERROR: session exercise ${exId} not in module.exerciseRefs`
          )
          ok = false
          process.exitCode = 1
        }
      }
    }
  }

  if (ok) console.log('[validate-exam] Cross-checks OK for bundled samples.')
  return ok
}

function validateAllSamples(): boolean {
  let ok = true
  if (!existsSync(SAMPLES)) {
    console.error(`[validate-exam] ERROR: samples dir missing: ${SAMPLES}`)
    return false
  }
  const files = readdirSync(SAMPLES).filter((f) => f.endsWith('.json'))
  for (const f of files) {
    const path = join(SAMPLES, f)
    if (f.includes('speaking-exercise') || f.includes('writing-exercise')) {
      ok = validateExerciseFile(path) && ok
    } else if (f.includes('attempt')) {
      ok = validateAttemptFile(path) && ok
    } else if (f.includes('session') && !f.includes('result')) {
      ok = validateSessionFile(path) && ok
    } else if (f.includes('result-summary') || f.includes('exam-result')) {
      ok = validateSummaryFile(path) && ok
    } else if (f.includes('module')) {
      ok = validateModuleFile(path) && ok
    } else if (f.includes('rubric')) {
      ok = validateRubricFile(path) && ok
    } else if (f.includes('model-answer')) {
      ok = validateModelAnswerFile(path) && ok
    } else {
      console.warn(`[validate-exam] SKIP unknown sample pattern: ${f}`)
    }
  }
  ok = crossCheckSamplesDir() && ok
  return ok
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.includes('--all-samples')) {
    const ok = validateAllSamples()
    process.exit(ok ? 0 : 1)
  }
  let ok = true
  const readFlag = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    if (i === -1 || !argv[i + 1]) return undefined
    return argv[i + 1]
  }
  const ex = readFlag('--exercise')
  if (ex) ok = validateExerciseFile(ex) && ok
  const at = readFlag('--attempt')
  if (at) ok = validateAttemptFile(at) && ok
  const se = readFlag('--session')
  if (se) ok = validateSessionFile(se) && ok
  const su = readFlag('--summary')
  if (su) ok = validateSummaryFile(su) && ok
  const mo = readFlag('--module')
  if (mo) ok = validateModuleFile(mo) && ok
  const ru = readFlag('--rubric')
  if (ru) ok = validateRubricFile(ru) && ok
  const ma = readFlag('--model-answer')
  if (ma) ok = validateModelAnswerFile(ma) && ok

  if (!ex && !at && !se && !su && !mo && !ru && !ma) {
    console.log(`Usage: see file header. Try: --all-samples`)
    process.exit(1)
  }
  process.exit(ok ? 0 : 1)
}

main()
