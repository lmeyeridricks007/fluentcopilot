/**
 * Content engine — normalization: map parsed LLM output to engine artifact types.
 * Add locale, cefr_level, provenance, client_generated_id.
 */

import type { ArtifactProvenance } from '../types/artifacts.js'

export interface NormalizeInput<T> {
  parsed: T
  locale: string
  cefr_level?: string
  scenario_id?: string
  scenario_code?: string
  provenance?: ArtifactProvenance
  client_generated_id?: string
}

export interface INormalizer<TInput, TArtifact> {
  normalize(input: NormalizeInput<TInput>): TArtifact | TArtifact[]
}
