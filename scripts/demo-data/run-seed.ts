/**
 * Optional: Output default (happy-path) demo dataset to JSON for reference.
 * Run: npx tsx scripts/demo-data/run-seed.ts
 * No database; app uses in-memory data from src/demo-data at runtime.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// Load from built app or use dynamic import; for script we inline the build
async function main() {
  const outDir = path.join(process.cwd(), 'scripts', 'demo-data', 'output')
  fs.mkdirSync(outDir, { recursive: true })

  // Use dynamic import of demo-data (same as app)
  const { getDemoDataset } = await import('../../src/demo-data')
  const dataset = getDemoDataset('happy-path')

  const payload = {
    scenario: 'happy-path',
    generatedAt: new Date().toISOString(),
    lessons: dataset.lessons.length,
    recommended: dataset.recommended.length,
    scenarios: dataset.scenarios.length,
    progress: dataset.progress,
    lessonProgress: dataset.lessonProgress,
    usage: dataset.usage,
    achievements: dataset.achievements,
    lessonsSample: dataset.lessons.slice(0, 3),
  }

  const outPath = path.join(outDir, 'demo-dataset-snapshot.json')
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8')
  console.log('Wrote', outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
