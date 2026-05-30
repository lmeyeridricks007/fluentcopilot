import {
  scenarioCatalogCategorySchema,
  scenarioReadinessSchema,
  scenarioSkillFocusSchema,
} from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import { practiceConversationModeSchema } from '@/lib/schemas/practice/practiceShared.schema'
import type { ScenarioCatalogFilterState, PremiumCatalogFilter } from '@/lib/practice/applyScenarioCatalogFilters'
import { defaultCatalogFilterState } from '@/lib/practice/applyScenarioCatalogFilters'

function splitCsv(param: string | null): string[] {
  if (!param?.trim()) return []
  return param.split(',').map((s) => s.trim()).filter(Boolean)
}

export function parseCatalogSearchParams(searchParams: URLSearchParams): ScenarioCatalogFilterState {
  const base = defaultCatalogFilterState()

  const cat = searchParams.get('category')
  const catParsed = cat ? scenarioCatalogCategorySchema.safeParse(cat) : null
  if (catParsed?.success) base.category = catParsed.data

  base.readiness = splitCsv(searchParams.get('readiness')).filter(
    (r) => scenarioReadinessSchema.safeParse(r).success
  ) as ScenarioCatalogFilterState['readiness']

  base.skillFocus = splitCsv(searchParams.get('skill')).filter(
    (s) => scenarioSkillFocusSchema.safeParse(s).success
  ) as ScenarioCatalogFilterState['skillFocus']

  base.modes = splitCsv(searchParams.get('mode')).filter(
    (m) => practiceConversationModeSchema.safeParse(m).success
  ) as ScenarioCatalogFilterState['modes']

  const prem = searchParams.get('premium') as PremiumCatalogFilter | null
  if (prem === 'free_only' || prem === 'premium_ok') base.premium = prem

  if (searchParams.get('weak') === '1') base.weakOnly = true

  return base
}

export function catalogFiltersToSearchParams(filters: ScenarioCatalogFilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.category) p.set('category', filters.category)
  if (filters.readiness.length) p.set('readiness', filters.readiness.join(','))
  if (filters.skillFocus.length) p.set('skill', filters.skillFocus.join(','))
  if (filters.modes.length) p.set('mode', filters.modes.join(','))
  if (filters.premium !== 'all') p.set('premium', filters.premium)
  if (filters.weakOnly) p.set('weak', '1')
  return p
}
