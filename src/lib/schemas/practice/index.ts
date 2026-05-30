/**
 * Practice & Mastery — Zod schemas and inferred TypeScript types.
 *
 * - **Content**: scenario, stages, personas, objectives, turns, skills, missions
 * - **Runtime / results**: scoringResult, practiceFeedback, practiceSessionResult, confidenceScore
 *
 * Validate fixtures with `tools/validate-practice-content.ts`.
 * See `docs/product/practice-schema-overview.md`.
 */

export * from '@/lib/schemas/practice/practiceShared.schema'
export * from '@/lib/schemas/practice/expectedSkills.schema'
export * from '@/lib/schemas/practice/abilityTag.schema'
export * from '@/lib/schemas/practice/confidenceScore.schema'
export * from '@/lib/schemas/practice/rolePersona.schema'
export * from '@/lib/schemas/practice/practiceObjective.schema'
export * from '@/lib/schemas/practice/conversationTurn.schema'
export * from '@/lib/schemas/practice/scenarioStage.schema'
export * from '@/lib/schemas/practice/scenario.schema'
export * from '@/lib/schemas/practice/scoringResult.schema'
export * from '@/lib/schemas/practice/practiceFeedback.schema'
export * from '@/lib/schemas/practice/mission.schema'
export * from '@/lib/schemas/practice/practiceSessionResult.schema'
export * from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
export * from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
export * from '@/lib/schemas/practice/skillTrack.schema'
export * from '@/lib/schemas/practice/weaknessInsight.schema'
export * from '@/lib/schemas/practice/abilityMasteryState.schema'
