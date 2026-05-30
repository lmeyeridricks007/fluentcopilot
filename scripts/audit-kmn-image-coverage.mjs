#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildExpandedA2KnmEntries } from '../src/lib/exam-system/a2KnmExamBank.ts'
import {
  getA2KnmMcqByPoolIndex,
  getA2KnmMcqPoolLength,
  pickKnmMcq,
} from '../src/lib/exam-system/knmMcqBank.ts'
import { KMN_QUIZ_QUESTIONS, KMN_SCENARIOS, KMN_FLASHCARDS } from '../src/lib/exam-prep/kmn/kmnSeedContent.ts'
import { resolveKnmSceneId } from '../src/lib/exam-prep/kmn/knmSceneResolver.ts'
import { resolveKnmQuizSceneId } from '../src/lib/exam-prep/kmn/knmSceneInference.ts'
import { KNM_SCENE_IMAGES } from '../src/lib/exam-prep/kmn/knmSceneImageRegistry.ts'

const pub = join(process.cwd(), 'public/images/knm')
const webpFiles = new Set(readdirSync(pub).filter((f) => f.endsWith('.webp')))

const gaps = []

function hasWebp(sceneId) {
  return webpFiles.has(`${sceneId}.webp`)
}

function auditExam(source, index, item, category) {
  const issues = []
  if (!item.illustrationId?.trim()) issues.push('missing illustrationId')
  const sceneId = resolveKnmSceneId(item.illustrationId, item.questionNl, category)
  if (!KNM_SCENE_IMAGES[sceneId]) issues.push(`unknown scene: ${sceneId}`)
  if (!hasWebp(sceneId)) issues.push(`missing WebP: ${sceneId}`)
  if (issues.length) {
    gaps.push({
      source,
      index: String(index),
      issues: issues.join('; '),
      sceneId,
      illustrationId: item.illustrationId,
      questionNl: item.questionNl.slice(0, 100),
    })
  }
  return sceneId
}

const sceneUsage = {}

// A2 pool
const a2n = getA2KnmMcqPoolLength()
for (let i = 0; i < a2n; i++) {
  const e = getA2KnmMcqByPoolIndex(i)
  const s = auditExam('A2 exam pool', i, e)
  sceneUsage[s] = (sceneUsage[s] ?? 0) + 1
}

// A1 full bank via repeated picks - get unique by question text
const a1Seen = new Set()
let a1Total = 0
let a1NoIll = 0
for (let i = 0; i < 500; i++) {
  const e = pickKnmMcq('A1', 'audit-a1', i)
  if (a1Seen.has(e.questionNl)) continue
  a1Seen.add(e.questionNl)
  a1Total++
  if (!e.illustrationId?.trim()) a1NoIll++
  auditExam('A1 bank', a1Total - 1, e)
}

// UI-only: surfaces without image component
const uiNoImage = [
  { surface: 'KMN scenarios', count: KMN_SCENARIOS.length, note: 'text-only situational choices, no image field' },
  { surface: 'KMN flashcards', count: KMN_FLASHCARDS.length, note: 'text front/back only' },
]

// Topic quizzes
let quizGaps = 0
for (const q of KMN_QUIZ_QUESTIONS) {
  const sceneId = resolveKnmQuizSceneId(q)
  if (!hasWebp(sceneId)) {
    quizGaps++
    gaps.push({
      source: 'KMN topic quiz',
      index: q.id,
      issues: `missing WebP: ${sceneId}`,
      sceneId,
      questionNl: q.promptNl.slice(0, 100),
    })
  }
}

const registryScenes = Object.keys(KNM_SCENE_IMAGES)
const unusedScenes = registryScenes.filter((s) => !webpFiles.has(`${s}.webp`))
const orphanWebp = [...webpFiles].map((f) => f.replace('.webp', '')).filter((s) => !registryScenes.includes(s))

console.log('=== KNM IMAGE COVERAGE ===\n')
console.log(`Scene registry entries: ${registryScenes.length}`)
console.log(`WebP files on disk: ${webpFiles.size}`)
console.log(`A2 KNM exam pool (MCQ): ${a2n} questions`)
console.log(`A2 expanded bank: ${buildExpandedA2KnmEntries().length} questions`)
console.log(`KMN topic quiz (seed): ${KMN_QUIZ_QUESTIONS.length} questions`)
console.log(`A1 bank (unique stems sampled): ${a1Total} questions, ${a1NoIll} without illustrationId`)
console.log(`Unique scenes used in A2 pool: ${Object.keys(sceneUsage).length}`)

console.log('\n--- Questions WITHOUT working images (asset/resolver gaps) ---')
console.log(`Total gaps: ${gaps.length}`)
if (gaps.length === 0) {
  console.log('None — every MCQ resolves to an existing WebP.')
} else {
  for (const g of gaps.slice(0, 20)) {
    console.log(`\n[${g.source} #${g.index}] ${g.issues}`)
    console.log(`  ${g.questionNl}`)
  }
  if (gaps.length > 20) console.log(`\n... and ${gaps.length - 20} more`)
}

console.log('\n--- Surfaces with NO image support (by design) ---')
for (const u of uiNoImage) {
  console.log(`  ${u.surface}: ${u.count} items — ${u.note}`)
}

if (a1NoIll > 0) {
  console.log(`\n--- A1 level ---`)
  console.log(`  ${a1NoIll}/${a1Total} A1 questions lack illustrationId (A1 training may not show KNM photos)`)
}

console.log('\n--- Registry vs disk ---')
console.log(`  Registry scenes missing WebP: ${unusedScenes.length}${unusedScenes.length ? ` (${unusedScenes.join(', ')})` : ''}`)
console.log(`  WebP files not in registry: ${orphanWebp.length}`)

const generic = ['municipality_desk', 'employment_contract', 'gp_waiting_room', 'school_classroom', 'integration_neighborhood', 'tax_blue_envelope', 'emergency_112_phone']
const shared = Object.entries(sceneUsage)
  .filter(([s]) => generic.includes(s))
  .reduce((n, [, c]) => n + c, 0)
console.log('\n--- Shared photos (have image, same scene for many stems) ---')
console.log(`  ${shared}/${a2n} A2 questions use one of ${generic.length} common scenes`)
console.log('  Top scenes:')
Object.entries(sceneUsage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([s, c]) => console.log(`    ${s}: ${c}`))

SCRIPT