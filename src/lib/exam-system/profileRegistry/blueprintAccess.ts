import type { ExamProfile, ExamRunMode, ExamSectionBlueprint } from '../types'

/**
 * Resolves section blueprints for the active run mode — single entry point so
 * generators never hardcode `profile.sections` shape.
 */
export function pickSectionsForMode(profile: ExamProfile, mode: ExamRunMode): ExamSectionBlueprint[] {
  if (mode === 'training' && profile.trainingBlueprint?.sections?.length) {
    return profile.trainingBlueprint.sections
  }
  if (profile.simulationBlueprint?.sections?.length) {
    return profile.simulationBlueprint.sections
  }
  return profile.sections ?? []
}

export function listSupportedSectionIds(profile: ExamProfile): string[] {
  return profile.supportedSections.map((s) => s.id)
}
