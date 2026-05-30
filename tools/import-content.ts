/**
 * Build a course.manifest.json from module files + validate.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/import-content.ts --out content/courses/nl-a2/course.manifest.json --modules content/modules/a2-m01-people-daily/module.json
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { CourseManifest } from '../src/lib/content/contentLoader'
import { loadCourseFromManifest } from '../src/lib/content/contentLoader'
import { validateCourse, formatValidationReport, parseReviewItemsFile } from '../src/lib/content/contentValidator'

function main() {
  const argv = process.argv.slice(2)
  const outIdx = argv.indexOf('--out')
  const modIdx = argv.indexOf('--modules')
  if (outIdx < 0 || modIdx < 0) {
    console.error('Usage: import-content.ts --out <manifest.json> --modules <a.json> [<b.json> ...]')
    process.exit(1)
  }
  const out = argv[outIdx + 1]
  const modPaths = argv.slice(modIdx + 1).filter((a) => !a.startsWith('--'))
  if (!modPaths.length) {
    console.error('No module paths')
    process.exit(1)
  }

  const base = dirname(resolve(out))
  const modulePaths = modPaths.map((p) => {
    const abs = resolve(p)
    const rel = relativeTo(base, abs)
    return rel
  })

  const manifest: CourseManifest = {
    id: 'course-nl-a2',
    title: 'Dutch A2',
    language: 'nl',
    cefrLevel: 'A2',
    description: 'Imported module bundle (Stage 5 pipeline)',
    metadata: { contentFormatVersion: 1, importedAt: new Date().toISOString() },
    modulePaths,
  }
  writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`[import-content] wrote manifest -> ${out}`)

  const course = loadCourseFromManifest(out)
  const reviewIdx = argv.indexOf('--review')
  let reviewItems: import('../src/lib/schemas/reviewItem.schema').ReviewItem[] | undefined
  if (reviewIdx >= 0) {
    const rp = argv[reviewIdx + 1]
    const raw = JSON.parse(readFileSync(rp, 'utf8')) as unknown
    const { items, issues } = parseReviewItemsFile(raw)
    if (issues.length) {
      console.error(issues)
      process.exit(1)
    }
    reviewItems = items
  }
  const report = validateCourse(course, reviewItems ? { reviewItems } : undefined)
  console.log(formatValidationReport(report))
  process.exit(report.ok ? 0 : 1)
}

function relativeTo(fromDir: string, absolutePath: string): string {
  let rel = relative(fromDir, absolutePath)
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

main()
