/**
 * Content engine — prompt template registry (in-memory / config).
 * Production: load from DB or config service.
 */

import type { PromptTemplateRef } from '../types/pipeline.js'

export interface PromptRegistryConfig {
  templates: PromptTemplateRef[]
}

const defaultTemplates: PromptTemplateRef[] = [
  {
    code: 'vocabulary_pack_generation',
    version: 1,
    template_body: 'Generate {{max_items}} Dutch vocabulary items for level {{cefr_level}}, locale {{locale}}. Return JSON: { "vocabulary": [ { "lemma": "...", "translations": [{ "locale": "en", "text": "..." }], "cefr_level": "{{cefr_level}}" } ] }.',
    input_schema: { type: 'object', required: ['locale', 'cefr_level', 'max_items'], properties: { locale: {}, cefr_level: {}, max_items: {} } },
    output_schema: { type: 'object', required: ['vocabulary'], properties: { vocabulary: { type: 'array', items: { type: 'object' } } } },
    constraints: { max_tokens: 2000, temperature: 0.3 },
    safety_requirements: {},
  },
  {
    code: 'dialogue_generation',
    version: 1,
    template_body: 'Generate a short dialogue for scenario {{scenario_code}}, Dutch, level {{cefr_level}}. {{num_turns}} turns. Return JSON: { "turns": [ { "speaker": "...", "text": "...", "translation": "..." } ], "scenario_code": "{{scenario_code}}" }.',
    input_schema: { type: 'object', required: ['scenario_code', 'locale', 'cefr_level'], properties: { scenario_code: {}, locale: {}, cefr_level: {}, num_turns: {} } },
    output_schema: { type: 'object', required: ['turns'], properties: { turns: { type: 'array' } } },
    constraints: { max_tokens: 1500, temperature: 0.5 },
    safety_requirements: {},
  },
]

let registry: PromptTemplateRef[] = defaultTemplates

export function setPromptRegistry(templates: PromptTemplateRef[]): void {
  registry = templates
}

export function getTemplate(code: string, version?: number): PromptTemplateRef | null {
  const match = version
    ? registry.find((t) => t.code === code && t.version === version)
    : registry.filter((t) => t.code === code).sort((a, b) => b.version - a.version)[0]
  return match ?? null
}

export function getTemplateForUseCase(useCase: string, _artifactType: string): PromptTemplateRef | null {
  const codeMap: Record<string, string> = {
    vocabulary_pack: 'vocabulary_pack_generation',
    dialogue: 'dialogue_generation',
    lesson_blueprint: 'lesson_blueprint_generation',
    exercise: 'exercise_generation',
    reflection_lesson: 'reflection_lesson_generation',
    exam_task: 'exam_task_generation',
  }
  const code = codeMap[useCase] ?? useCase
  return getTemplate(code)
}
