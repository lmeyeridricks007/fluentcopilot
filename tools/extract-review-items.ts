/**
 * Extract ReviewItem[] from module JSON (Stage 4/5 bridge).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/extract-review-items.ts content/modules/a2-m01-people-daily/module.json
 *   npx tsx --tsconfig tsconfig.json tools/extract-review-items.ts <module.json> --out content/review-items/a2-m01-people-daily.json
 *   ... --patch-module   (writes reviewItemRefs on each lesson in the module file)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname as dirnamePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { moduleSchema } from '../src/lib/schemas/module.schema'
import { extractReviewItemsFromModule, suggestedReviewItemRefsForLesson } from '../src/lib/content/reviewItemExtractor'

const __dirname = dirnamePath(fileURLToPath(import.meta.url))

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--patch-module')
  const patch = process.argv.includes('--patch-module')
  let outIdx = args.indexOf('--out')
  const modulePath = args[0]
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null
  if (!modulePath) {
    console.error('Usage: extract-review-items.ts <module.json> [--out path] [--patch-module]')
    process.exit(1)
  }

  const raw = JSON.parse(readFileSync(modulePath, 'utf8')) as unknown
  const mod = moduleSchema.parse(raw)
  const items = extractReviewItemsFromModule(mod)
  const payload = { reviewItems: items }

  if (outPath) {
    mkdirSync(dirnamePath(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
    console.log(`[extract-review-items] wrote ${items.length} items -> ${outPath}`)
  } else {
    console.log(JSON.stringify(payload, null, 2))
  }

  if (patch) {
    for (const lesson of mod.lessons) {
      lesson.reviewItemRefs = suggestedReviewItemRefsForLesson(lesson, mod)
    }
    writeFileSync(modulePath, JSON.stringify(mod, null, 2), 'utf8')
    console.log(`[extract-review-items] patched reviewItemRefs in ${modulePath}`)
  }
}

main()
