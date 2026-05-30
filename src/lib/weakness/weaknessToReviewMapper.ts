import type { WeaknessCategoryDefinition } from '@/lib/weakness/types'

export function reviewActionForCategory(def: WeaknessCategoryDefinition): {
  label: string
  href: string
} {
  const isMistakes = def.reviewHref.includes('mistakes')
  return {
    label: isMistakes ? 'Fix mistakes review' : 'Short daily review',
    href: def.reviewHref,
  }
}
