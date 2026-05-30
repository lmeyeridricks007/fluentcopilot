/**
 * nl-NL A2 curriculum — sourced from data/curriculum/nl-NL/A2/catalog.bundle.json
 * (regenerate bundle via: python3 scripts/generate_a2_nl_curriculum.py)
 *
 * Types match the generator output only — no legacy/optional shapes.
 */

import type { DemoLesson } from '../types'
import bundleJson from '../../../data/curriculum/nl-NL/A2/catalog.bundle.json'

export type A2BandId = 'A2.1' | 'A2.2' | 'A2.3'

export interface A2ManifestBand {
  band: A2BandId
  label: string
  unit_ids: string[]
}

export interface A2CatalogManifest {
  schema_version: number
  locale: string
  instruction_locale: string
  cefr_level: string
  title: string
  summary: string
  unit_order: string[]
  a2_bands: A2ManifestBand[]
}

export interface A2CatalogUnit {
  id: string
  cefr_level: string
  locale: string
  a2_band: A2BandId
  title: string
  summary: string
  objectives_can_do: string[]
  integration_scripts_summary: string
  grammar_focus: string[]
  vocabulary_domains: string[]
  lesson_ids: string[]
}

export interface A2StepIllustration {
  src: string
  alt: string
  width?: number
  height?: number
}

export type A2StepSkillFocus =
  | 'listening'
  | 'reading'
  | 'speaking'
  | 'writing'
  | 'grammar'
  | 'review'
  | 'mixed'

export type A2ListeningLevel = 'slow' | 'natural_slow' | 'natural'

export interface A2LessonPlanStep {
  step: number
  learner_title: string
  activity: string
  teacher_notes?: string
  visual_ascii?: string | null
  illustration?: A2StepIllustration | null
  interaction?: unknown
  example_response?: string
  skill_focus: A2StepSkillFocus
  listening_level?: A2ListeningLevel
  recycle_lemmas?: string[]
  common_error_tags?: string[]
}

export interface A2GrammarPointRow {
  point: string
  examples_nl: string[]
  examples_en: string[]
}

export interface A2CatalogLesson {
  id: string
  unit_id: string
  cefr_level: string
  locale: string
  metadata: {
    archetype: string
    primary_skills: string[]
    voice_optional?: boolean
  }
  catalog: {
    title: string
    description: string
    topic: string
    type: DemoLesson['type']
    durationMinutes: number
    isPremium?: boolean
  }
  pedagogy: {
    objective: string
    can_do_outcomes: string[]
    grammar_primary: string
    grammar_primary_label: string
    prior_lesson_ids: string[]
    target_vocabulary_lemmas: string[]
    grammar_points: A2GrammarPointRow[]
    micro_outcomes: string[]
  }
  lesson_plan: {
    warm_up_minutes: number
    presentation_minutes: number
    practice_minutes: number
    check_minutes: number
    steps: A2LessonPlanStep[]
  }
  assessment: {
    quiz_ideas: string[]
    success_criteria: string
  }
  content_outline?: Record<string, unknown>
  content_refs?: Record<string, unknown>
  provenance: {
    author: string
    last_updated: string
    sources_consulted: string[]
  }
}

interface CatalogBundle {
  manifest: A2CatalogManifest
  units: A2CatalogUnit[]
  lessons: A2CatalogLesson[]
}

const bundle = bundleJson as CatalogBundle

export const A2_MANIFEST = bundle.manifest
export const A2_UNITS = bundle.units
export const A2_LESSON_RECORDS = bundle.lessons

export const A2_LESSON_IDS_ORDERED = A2_UNITS.flatMap((u) => u.lesson_ids)

/** Unit rows for curriculum path UI (manifest order). */
export const A2_CURRICULUM_PATH_UNITS: {
  id: string
  title: string
  summary: string
  lessonIds: string[]
  a2Band: A2BandId
}[] = A2_UNITS.map((u) => ({
  id: u.id,
  title: u.title,
  summary: u.summary,
  lessonIds: u.lesson_ids,
  a2Band: u.a2_band,
}))

export function a2RecordsToDemoLessons(records: A2CatalogLesson[]): DemoLesson[] {
  return records.map((r) => ({
    id: r.id,
    title: r.catalog.title,
    description: r.catalog.description,
    level: r.cefr_level,
    topic: r.catalog.topic,
    type: r.catalog.type,
    durationMinutes: r.catalog.durationMinutes,
    isPremium: r.catalog.isPremium ?? false,
  }))
}

const lessonRecordById = new Map(A2_LESSON_RECORDS.map((l) => [l.id, l]))

export function getA2LessonRecordById(lessonId: string): A2CatalogLesson | undefined {
  return lessonRecordById.get(lessonId)
}

export function a2BandOrder(band: A2BandId): number {
  if (band === 'A2.1') return 1
  if (band === 'A2.2') return 2
  if (band === 'A2.3') return 3
  return 0
}

/** Lessons whose step-7 self-check contains at least one item with this `common_error_tags` entry. */
export function a2LessonIdsWithSelfCheckTag(tag: string): string[] {
  const t = tag.trim().toLowerCase()
  if (!t) return []
  return A2_LESSON_RECORDS.filter((rec) =>
    rec.lesson_plan.steps.some((st) => {
      const intr = st.interaction as { kind?: string; items?: unknown[] } | undefined
      if (!intr || intr.kind !== 'self_check_quiz' || !Array.isArray(intr.items)) return false
      return intr.items.some((it) => {
        if (!it || typeof it !== 'object') return false
        const tags = (it as { common_error_tags?: string[] }).common_error_tags
        return Array.isArray(tags) && tags.some((x) => String(x).toLowerCase() === t)
      })
    })
  ).map((r) => r.id)
}
