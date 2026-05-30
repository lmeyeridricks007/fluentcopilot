import { REGISTERED_SCHEMA_MODULES } from '@/features/learning-path/schemaModuleRegistry'
import type { AbilityUnlock } from '@/lib/retention/types'

export interface ModuleAbilityDef {
  moduleId: string
  abilityId: string
  /** Short “you can now…” line */
  headline: string
}

function headlineFromModule(reg: (typeof REGISTERED_SCHEMA_MODULES)[number]): string {
  const withCanDo = reg.module.lessons
    .map((l) => l.canDoStatements?.[0])
    .filter((x): x is string => Boolean(x))
  const pick = withCanDo[withCanDo.length - 1]
  if (pick) {
    return pick.replace(/^I can /i, 'You can now ')
  }
  const g = reg.module.learningGoals.find((x) => /^i can /i.test(x)) ?? reg.module.learningGoals[0]
  if (g) return g.replace(/^I can /i, 'You can now ')
  return `You can now use skills from “${reg.module.title}”`
}

/** One headline per implemented schema module — tied to real outcomes, not fluff */
export function moduleAbilityDefinitions(): ModuleAbilityDef[] {
  return REGISTERED_SCHEMA_MODULES.map((reg) => ({
    moduleId: reg.moduleId,
    abilityId: `ability-${reg.moduleId}`,
    headline: headlineFromModule(reg),
  }))
}

export function findModuleIdForLesson(lessonId: string): string | null {
  for (const reg of REGISTERED_SCHEMA_MODULES) {
    if (reg.module.lessons.some((l) => l.id === lessonId)) return reg.moduleId
  }
  return null
}

export function isModuleComplete(moduleId: string, completedLessonIds: Set<string>): boolean {
  const reg = REGISTERED_SCHEMA_MODULES.find((r) => r.moduleId === moduleId)
  if (!reg) return false
  return reg.module.lessons.every((l) => completedLessonIds.has(l.id))
}

export function maybeUnlockAbility(
  existing: AbilityUnlock[],
  moduleId: string,
  completedLessonIds: Set<string>,
  nowIso: string
): { abilities: AbilityUnlock[]; newlyUnlocked: AbilityUnlock | null } {
  if (!isModuleComplete(moduleId, completedLessonIds)) {
    return { abilities: existing, newlyUnlocked: null }
  }
  const def = moduleAbilityDefinitions().find((d) => d.moduleId === moduleId)
  if (!def) return { abilities: existing, newlyUnlocked: null }
  if (existing.some((a) => a.id === def.abilityId)) {
    return { abilities: existing, newlyUnlocked: null }
  }
  const row: AbilityUnlock = {
    id: def.abilityId,
    moduleId,
    headline: def.headline,
    unlockedAt: nowIso,
  }
  return { abilities: [...existing, row], newlyUnlocked: row }
}
