'use client'

import { useState } from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ResolvedCategoryVisual, ResolvedScenarioVisual } from '@/lib/practice/scenarioImageRegistry'
import {
  Briefcase,
  Coffee,
  Home,
  Landmark,
  MessagesSquare,
  Stethoscope,
  TrainFront,
  Wrench,
} from 'lucide-react'

function CategoryIcon({
  category,
  className,
}: {
  category: ScenarioCatalogCategory
  className?: string
}) {
  const cn = clsx('text-white/90 drop-shadow-sm', className)
  switch (category) {
    case 'food':
      return <Coffee className={cn} aria-hidden />
    case 'work':
      return <Briefcase className={cn} aria-hidden />
    case 'health':
      return <Stethoscope className={cn} aria-hidden />
    case 'municipality':
      return <Landmark className={cn} aria-hidden />
    case 'housing':
      return <Home className={cn} aria-hidden />
    case 'transport':
      return <TrainFront className={cn} aria-hidden />
    case 'social':
      return <MessagesSquare className={cn} aria-hidden />
    case 'problem_solving':
      return <Wrench className={cn} aria-hidden />
    default:
      return null
  }
}

const VARIANT_BOX: Record<
  'thumbnail' | 'hero' | 'compact' | 'square' | 'categoryStrip',
  { aspect: string; maxH?: string; icon: string }
> = {
  thumbnail: { aspect: 'aspect-[16/9]', maxH: 'max-h-[120px]', icon: 'w-10 h-10' },
  hero: { aspect: 'aspect-[2.4/1]', maxH: 'max-h-[148px]', icon: 'w-12 h-12' },
  compact: { aspect: 'aspect-[2.1/1]', maxH: 'max-h-[96px]', icon: 'w-8 h-8' },
  square: { aspect: 'aspect-square', icon: 'w-6 h-6' },
  categoryStrip: { aspect: 'aspect-[3.2/1]', maxH: 'max-h-[76px]', icon: 'w-7 h-7' },
}

function scenarioImageUrl(
  visual: ResolvedScenarioVisual | ResolvedCategoryVisual,
  variant: keyof typeof VARIANT_BOX
): string | null {
  const hero =
    'heroSrc' in visual && visual.heroSrc && visual.heroSrc.length > 0 ? visual.heroSrc : null
  const thumb =
    'thumbnailSrc' in visual && visual.thumbnailSrc && visual.thumbnailSrc.length > 0
      ? visual.thumbnailSrc
      : null
  const img = 'imageSrc' in visual && visual.imageSrc && visual.imageSrc.length > 0 ? visual.imageSrc : null
  const raw =
    variant === 'hero' || variant === 'compact' ? hero || img || thumb : thumb || img || hero
  if (raw && raw.length > 0) return raw
  return null
}

function chipLabel(visual: ResolvedScenarioVisual | ResolvedCategoryVisual): string {
  return visual.themeLabelEn
}

type Props = {
  visual: ResolvedScenarioVisual | ResolvedCategoryVisual
  variant: keyof typeof VARIANT_BOX
  className?: string
  /** First paint on scenario launch */
  priority?: boolean
  showSceneChip?: boolean
  /**
   * Fill a fixed-size parent (`relative h-* w-*`). Avoids `w-full` + `aspect-square` fighting
   * small `h-11 w-11` overrides in flex rows (thin panoramic strip bug).
   */
  fillSlot?: boolean
}

/**
 * Scene anchor: optional `next/image`, else stable gradient + icon. Fixed aspect ratio — no CLS.
 */
export function ScenarioSceneVisual({
  visual,
  variant,
  className,
  priority = false,
  showSceneChip,
  fillSlot = false,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const box = VARIANT_BOX[variant]
  const imageSrc = scenarioImageUrl(visual, variant)

  const showImg = Boolean(imageSrc && !imgFailed)
  const category = visual.category

  const rootLayout = fillSlot
    ? clsx('absolute inset-0 min-h-0 overflow-hidden bg-slate-200/80', className)
    : clsx(
        'relative overflow-hidden rounded-xl bg-slate-200/80',
        variant === 'square'
          ? 'aspect-square h-[4.5rem] w-[4.5rem] shrink-0'
          : clsx('w-full', box.aspect, box.maxH),
        className
      )

  return (
    <div className={rootLayout} role="img" aria-label={visual.alt}>
      <div
        className={clsx('absolute inset-0 z-0', visual.gradientClass)}
        aria-hidden
      />
      {showImg ? (
        <Image
          src={imageSrc!}
          alt={visual.alt}
          fill
          sizes="(max-width: 512px) 100vw, 28rem"
          className="object-cover z-[1]"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setImgFailed(true)}
        />
      ) : null}
      {!showImg ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
          <CategoryIcon category={category} className={box.icon} />
        </div>
      ) : null}
      {showSceneChip ? (
        <div className="absolute bottom-2 left-2 z-[2] rounded-lg bg-black/45 backdrop-blur-[2px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          {chipLabel(visual)}
        </div>
      ) : null}
      {showImg ? (
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 z-[2] bg-gradient-to-t from-black/25 to-transparent pointer-events-none"
          aria-hidden
        />
      ) : null}
    </div>
  )
}
