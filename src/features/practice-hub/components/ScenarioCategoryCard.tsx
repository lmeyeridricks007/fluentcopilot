import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import { resolveCategoryVisual } from '@/lib/visual/scenarioVisualRegistry'
import type { ScenarioCategoryVm } from '../types'

export function ScenarioCategoryCard({ cat }: { cat: ScenarioCategoryVm }) {
  const visual = resolveCategoryVisual(cat.id as ScenarioCatalogCategory, cat.title)
  return (
    <Link href={cat.href} className="block min-w-[156px] max-w-[196px] shrink-0 snap-start motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5">
      <Card
        variant="outlined"
        padding="none"
        className="h-full min-h-[148px] border-slate-200/90 hover:border-primary-200/80 hover:shadow-md shadow-sm transition-[border-color,box-shadow] flex flex-col overflow-hidden"
      >
        <ScenarioSceneVisual
          visual={visual}
          variant="hero"
          showSceneChip
          className="rounded-none max-h-[96px]"
        />
        <div className="p-3 flex flex-col flex-1">
        <span className="text-lg leading-none opacity-80" aria-hidden>
          {cat.icon}
        </span>
        <p className="text-body-sm font-semibold text-ink-primary mt-2 leading-tight line-clamp-2">{cat.title}</p>
        <p className="text-caption text-ink-secondary mt-1 line-clamp-2 flex-1">{cat.description}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <span className="text-caption font-medium text-ink-secondary">
            {cat.scenarioCount > 0 ? `${cat.scenarioCount} scenario${cat.scenarioCount === 1 ? '' : 's'}` : 'Soon'}
          </span>
          <ChevronRight className="w-4 h-4 text-ink-tertiary" aria-hidden />
        </div>
        </div>
      </Card>
    </Link>
  )
}
