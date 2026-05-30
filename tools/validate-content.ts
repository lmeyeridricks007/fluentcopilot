/**
 * Validate course / module / lesson JSON against Zod + Stage 5 content rules.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/validate-content.ts
 *   npx tsx --tsconfig tsconfig.json tools/validate-content.ts --manifest content/courses/nl-a2/course.manifest.json --review content/review-items/a2-m01-people-daily.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-content.ts --module content/modules/a2-m01-people-daily/module.json --review content/review-items/a2-m01-people-daily.json
 *   npx tsx --tsconfig tsconfig.json tools/validate-content.ts path/to/course.json [path/to/review-items.json]
 *
 * Legacy: single arg `path/to/course.json` still works (embedded modules).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { courseSchema, type Course } from '../src/lib/schemas/course.schema'
import { reviewItemSchema } from '../src/lib/schemas/reviewItem.schema'
import { lessonSchema } from '../src/lib/schemas/lesson.schema'
import { moduleSchema } from '../src/lib/schemas/module.schema'
import type { LessonStep } from '../src/lib/schemas/lessonStep.schema'
import type { Lesson } from '../src/lib/schemas/lesson.schema'
import {
  validateCourse,
  validateModule,
  formatValidationReport,
  parseReviewItemsFile,
} from '../src/lib/content/contentValidator'
import { loadCourseFromManifest, loadCourseFromFile, loadModuleFromFile } from '../src/lib/content/contentLoader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SAMPLES = join(ROOT, 'content/samples')

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function collectStepIds(lesson: Lesson, out: Map<string, string>): void {
  for (const step of lesson.steps) {
    const s = step as LessonStep
    if (out.has(s.id)) {
      console.warn(`[validate-content] WARN: duplicate step id ${s.id} (lessons ${out.get(s.id)} vs ${lesson.id})`)
    }
    out.set(s.id, lesson.id)
  }
}

function loadReviewItems(path: string | null): import('../src/lib/schemas/reviewItem.schema').ReviewItem[] | undefined {
  if (!path || !existsSync(path)) {
    if (path) console.warn(`[validate-content] WARN: review file missing: ${path}`)
    return undefined
  }
  const raw = readJson(path)
  const { items, issues } = parseReviewItemsFile(raw)
  if (issues.length) {
    console.error(issues)
    process.exit(1)
  }
  return items
}

function validateLegacyCourse(coursePath: string, reviewPath: string | null): void {
  const raw = readJson(coursePath)
  const parsed = courseSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(parsed.error.flatten())
    process.exit(1)
  }
  const course: Course = parsed.data
  const reviewItems = loadReviewItems(reviewPath)
  const report = validateCourse(course, reviewItems ? { reviewItems } : undefined)
  console.log(formatValidationReport(report))
  if (!report.ok) process.exit(1)

  const globalSteps = new Map<string, string>()
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      collectStepIds(lesson, globalSteps)
    }
  }
  console.log(`[validate-content] OK: ${coursePath}`)
}

function main(): void {
  const argv = process.argv.slice(2)
  const manIdx = argv.indexOf('--manifest')
  const modIdx = argv.indexOf('--module')
  const revIdx = argv.indexOf('--review')

  if (manIdx >= 0) {
    const manifestPath = argv[manIdx + 1]
    let reviewPath: string | null = revIdx >= 0 ? argv[revIdx + 1] : null
    if (!reviewPath) {
      const guess = join(ROOT, 'content/review-items/a2-m01-people-daily.json')
      if (existsSync(guess)) reviewPath = guess
    }
    const items = loadReviewItems(reviewPath && existsSync(reviewPath) ? reviewPath : null)
    const course = loadCourseFromManifest(manifestPath)
    const report = validateCourse(course, items ? { reviewItems: items } : undefined)
    console.log(formatValidationReport(report))
    if (!report.ok) process.exit(1)
    console.log(`[validate-content] OK manifest: ${manifestPath}`)
    return
  }

  if (modIdx >= 0) {
    const modulePath = argv[modIdx + 1]
    const reviewPath = revIdx >= 0 ? argv[revIdx + 1] : null
    const mod = loadModuleFromFile(modulePath)
    const items = loadReviewItems(reviewPath && existsSync(reviewPath) ? reviewPath : null)
    const report = validateModule(mod, items ? new Set(items.map((r) => r.id)) : undefined)
    console.log(formatValidationReport(report))
    if (!report.ok) process.exit(1)
    console.log(`[validate-content] OK module: ${modulePath}`)
    return
  }

  const posArgs = argv.filter((a) => !a.startsWith('--'))
  const coursePath = posArgs[0] ?? join(SAMPLES, 'sample-course.json')
  const legacyReview = posArgs[1] ?? join(SAMPLES, 'sample-review-items.json')
  validateLegacyCourse(coursePath, existsSync(legacyReview) ? legacyReview : null)

  const lessonPath = join(SAMPLES, 'sample-lesson.json')
  const modulePath = join(SAMPLES, 'sample-module.json')
  if (existsSync(lessonPath)) {
    const lr = lessonSchema.safeParse(readJson(lessonPath))
    if (!lr.success) {
      console.error(lr.error.flatten())
      process.exit(1)
    }
    console.log(`[validate-content] OK: ${lessonPath}`)
  }
  if (existsSync(modulePath)) {
    const mr = moduleSchema.safeParse(readJson(modulePath))
    if (!mr.success) {
      console.error(mr.error.flatten())
      process.exit(1)
    }
    console.log(`[validate-content] OK: ${modulePath}`)
  }

  const reviewOnly = join(SAMPLES, 'sample-review-items.json')
  if (existsSync(reviewOnly)) {
    const reviewRaw = readJson(reviewOnly) as { reviewItems?: unknown }
    if (!Array.isArray(reviewRaw.reviewItems)) process.exit(1)
    const seen = new Set<string>()
    for (const item of reviewRaw.reviewItems) {
      const r = reviewItemSchema.safeParse(item)
      if (!r.success) {
        console.error(r.error.flatten())
        process.exit(1)
      }
      if (seen.has(r.data.id)) process.exit(1)
      seen.add(r.data.id)
    }
    console.log(`[validate-content] OK: ${reviewOnly}`)
  }
}

main()
