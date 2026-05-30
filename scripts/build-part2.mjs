#!/usr/bin/env node
import { writeFileSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'part2-data')
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'generate-a2-reading-mcq-drafts-part2.mjs')

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function formatItem(cat, it) {
  const opts = it.options.map((o) => `    opt('${o.id}', '${esc(o.label)}'),`).join('\n')
  const correct = it.correctOptionIds.map((x) => `'${x}'`).join(', ')
  return `add('${cat}', {
  introNl: '${esc(it.introNl)}',
  readHintEn: '${esc(it.readHintEn)}',
  passageNl:
    '${esc(it.passageNl)}',
  passageEn:
    '${esc(it.passageEn)}',
  questionNl: '${esc(it.questionNl)}',
  questionEn: '${esc(it.questionEn)}',
  options: [
${opts}
  ],
  correctOptionIds: [${correct}],
})
`
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.mjs')).sort()
let body = ''
let count = 0
for (const f of files) {
  const mod = await import(join(DIR, f))
  body += mod.header + '\n'
  for (const it of mod.items) {
    body += formatItem(mod.category, it) + '\n'
    count++
  }
}
writeFileSync(OUT, body)
console.log('Wrote', count, 'items to', OUT)
