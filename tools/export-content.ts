/**
 * Export course or module JSON to a folder layout (modules + optional review items).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/export-content.ts --course content/courses/nl-a2/course.full.json --dir content/_export
 *   npx tsx --tsconfig tsconfig.json tools/export-content.ts --module content/modules/a2-m01-people-daily/module.json --dir content/_export
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { courseSchema } from '../src/lib/schemas/course.schema'
import { moduleSchema } from '../src/lib/schemas/module.schema'
import { extractReviewItemsFromModule } from '../src/lib/content/reviewItemExtractor'

function main() {
  const argv = process.argv.slice(2)
  const dirIdx = argv.indexOf('--dir')
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : null
  const cIdx = argv.indexOf('--course')
  const mIdx = argv.indexOf('--module')
  if (!dir) {
    console.error('Usage: export-content.ts (--course path | --module path) --dir <outputDir>')
    process.exit(1)
  }
  mkdirSync(dir, { recursive: true })

  if (cIdx >= 0) {
    const path = argv[cIdx + 1]
    const course = courseSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
    writeFileSync(join(dir, 'course.json'), JSON.stringify(course, null, 2), 'utf8')
    for (const mod of course.modules) {
      const mdir = join(dir, 'modules', mod.id)
      mkdirSync(mdir, { recursive: true })
      writeFileSync(join(mdir, 'module.json'), JSON.stringify(mod, null, 2), 'utf8')
      const items = extractReviewItemsFromModule(mod)
      writeFileSync(join(dir, 'review-items', `${mod.id}.json`), JSON.stringify({ reviewItems: items }, null, 2), 'utf8')
    }
    console.log(`[export-content] exported course + ${course.modules.length} module(s) -> ${dir}`)
    return
  }

  if (mIdx >= 0) {
    const path = argv[mIdx + 1]
    const mod = moduleSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
    const mdir = join(dir, 'modules', mod.id)
    mkdirSync(mdir, { recursive: true })
    writeFileSync(join(mdir, 'module.json'), JSON.stringify(mod, null, 2), 'utf8')
    const items = extractReviewItemsFromModule(mod)
    mkdirSync(join(dir, 'review-items'), { recursive: true })
    writeFileSync(join(dir, 'review-items', `${mod.id}.json`), JSON.stringify({ reviewItems: items }, null, 2), 'utf8')
    console.log(`[export-content] exported module -> ${mdir}`)
    return
  }

  console.error('Provide --course or --module')
  process.exit(1)
}

main()
