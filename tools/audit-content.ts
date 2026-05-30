/**
 * Emit QA audit prompt for a lesson or module JSON file (for LLM or human review).
 * Does not call an LLM. Optional: write markdown wrapper to --out.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/audit-content.ts --lesson content/samples/sample-lesson.json
 *   npx tsx --tsconfig tsconfig.json tools/audit-content.ts --module content/modules/a2-m01-people-daily/module.json --out /tmp/audit.md
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  QA_AUDITOR_SYSTEM_PROMPT,
  qaLessonReviewPrompt,
  qaModuleReviewPrompt,
} from '../src/lib/content-generation/qaPromptTemplates'

function main() {
  const argv = process.argv.slice(2)
  const lIdx = argv.indexOf('--lesson')
  const mIdx = argv.indexOf('--module')
  const oIdx = argv.indexOf('--out')
  const out = oIdx >= 0 ? argv[oIdx + 1] : null

  let body: string
  if (lIdx >= 0) {
    const path = argv[lIdx + 1]
    const json = readFileSync(path, 'utf8')
    body = `${QA_AUDITOR_SYSTEM_PROMPT}\n\n${qaLessonReviewPrompt(json)}`
  } else if (mIdx >= 0) {
    const path = argv[mIdx + 1]
    const json = readFileSync(path, 'utf8')
    body = `${QA_AUDITOR_SYSTEM_PROMPT}\n\n${qaModuleReviewPrompt(json)}`
  } else {
    console.error('Usage: audit-content.ts (--lesson path | --module path) [--out path]')
    process.exit(1)
  }

  const wrapped = `# Content QA audit prompt\n\nPaste the block below into your LLM, or review manually.\n\n---\n\n${body}\n`
  if (out) {
    writeFileSync(out, wrapped, 'utf8')
    console.log(`[audit-content] wrote ${out}`)
  } else {
    console.log(wrapped)
  }
}

main()
