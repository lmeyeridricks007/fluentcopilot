'use client'

import type { KeyboardEvent } from 'react'
import Image from 'next/image'
import {
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  Home,
  Lock,
  Map,
  MessageCircle,
  Phone,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Train,
  Users,
  Wrench,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import type {
  SpeakLiveCatalogItem,
  SpeakLiveScenarioAccent,
  SpeakLiveScenarioIcon,
} from '../speakLiveScenarios'

const ACCENT_STYLES: Record<
  SpeakLiveScenarioAccent,
  {
    icon: string
    chip: string
    selected: string
    surface: string
  }
> = {
  emerald: {
    icon: 'bg-[#DCFCE7] text-[#166534] ring-1 ring-[#BBF7D0]/90',
    chip: 'border border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]',
    selected: 'border-[#BBF7D0] bg-[#f0fdf4]/90 shadow-sm',
    surface: 'from-[#DCFCE7]/25 via-white to-white',
  },
  amber: {
    icon: 'bg-[#FFFBEB] text-amber-950 ring-1 ring-amber-200/50',
    chip: 'border border-amber-200/60 bg-[#FFFBEB]/90 text-amber-950',
    selected: 'border-amber-200/80 bg-[#FFFBEB]/80 shadow-sm',
    surface: 'from-[#FFFBEB]/40 via-white to-white',
  },
  sky: {
    icon: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
    chip: 'border border-violet-200/70 bg-violet-50/90 text-violet-900',
    selected: 'border-violet-200 bg-violet-50/90 shadow-sm',
    surface: 'from-violet-50/30 via-white to-violet-50/20',
  },
  violet: {
    icon: 'bg-[#F3E8FF] text-[#6D28D9] ring-1 ring-violet-200/70',
    chip: 'border border-violet-200/70 bg-[#F3E8FF] text-[#5B21B6]',
    selected: 'border-violet-200 bg-violet-50/90 shadow-sm',
    surface: 'from-violet-50/25 via-white to-white',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/65',
    chip: 'border border-rose-200/70 bg-rose-50 text-rose-900',
    selected: 'border-rose-200 bg-rose-50/90 shadow-sm',
    surface: 'from-rose-50/30 via-white to-white',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/80',
    chip: 'border border-slate-200/90 bg-slate-50 text-slate-800',
    selected: 'border-slate-300 bg-slate-50 shadow-sm',
    surface: 'from-slate-50/40 via-white to-slate-50/20',
  },
}

function ScenarioIcon({
  icon,
  className,
}: {
  icon: SpeakLiveScenarioIcon
  className?: string
}) {
  switch (icon) {
    case 'train':
      return <Train className={className} aria-hidden />
    case 'coffee':
      return <Coffee className={className} aria-hidden />
    case 'shopping_cart':
      return <ShoppingCart className={className} aria-hidden />
    case 'map':
      return <Map className={className} aria-hidden />
    case 'calendar':
      return <CalendarCheck className={className} aria-hidden />
    case 'stethoscope':
      return <Stethoscope className={className} aria-hidden />
    case 'briefcase':
      return <Briefcase className={className} aria-hidden />
    case 'home':
      return <Home className={className} aria-hidden />
    case 'wrench':
      return <Wrench className={className} aria-hidden />
    case 'phone':
      return <Phone className={className} aria-hidden />
    case 'message_circle':
      return <MessageCircle className={className} aria-hidden />
    case 'users':
      return <Users className={className} aria-hidden />
    case 'sparkles':
      return <Sparkles className={className} aria-hidden />
    default:
      return <Sparkles className={className} aria-hidden />
  }
}

export type SpeakLiveScenarioCardLayout = 'default' | 'compact' | 'browseFeatured' | 'browseRow'

export function SpeakLiveScenarioCard({
  item,
  selected,
  onSelect,
  compact = false,
  layout,
  browseOptions,
}: {
  item: SpeakLiveCatalogItem
  selected: boolean
  onSelect: (itemId: string) => void
  compact?: boolean
  /** Explicit layout; when omitted, `compact` maps to `compact` layout. */
  layout?: SpeakLiveScenarioCardLayout
  browseOptions?: {
    hideCategory?: boolean
    hideLiveAvailability?: boolean
    /** Hide A1·A2·B1 row when the parent group already states levels once. */
    hideBrowseLevel?: boolean
  }
}) {
  const resolvedLayout: SpeakLiveScenarioCardLayout = layout ?? (compact ? 'compact' : 'default')
  const accent = ACCENT_STYLES[item.accent ?? 'slate']
  const isLive = item.availability === 'live'
  const isCoach = item.type === 'coach_mode'

  const selectThisCard = () => {
    onSelect(item.id)
  }

  const onCardSurfaceKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectThisCard()
    }
  }

  const hideCategory = Boolean(browseOptions?.hideCategory)
  const hideLiveAvailability = Boolean(browseOptions?.hideLiveAvailability)
  const hideBrowseLevel = Boolean(browseOptions?.hideBrowseLevel)

  if (resolvedLayout === 'browseRow') {
    return (
      <div
        tabIndex={0}
        aria-current={selected ? 'true' : undefined}
        aria-label={`${item.title}. ${selected ? 'Selected.' : isLive ? 'Live scenario.' : 'Scenario.'}`}
        onClick={selectThisCard}
        onKeyDown={onCardSurfaceKeyDown}
        className="block w-full min-h-touch rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/40 focus-visible:ring-offset-2"
      >
        <Card
          variant="outlined"
          padding="none"
          className={clsx(
            'rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_18px_-14px_rgba(15,23,42,0.08)] transition-all duration-200 hover:border-slate-300/80 hover:shadow-[0_8px_22px_-16px_rgba(15,23,42,0.1)] active:scale-[0.995]',
            selected && 'border-[#93C5FD] ring-1 ring-[#BFDBFE]/90 shadow-[0_8px_24px_-16px_rgba(37,99,235,0.12)]'
          )}
        >
          <div className="relative flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div
              className={clsx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white shadow-sm',
                accent.icon
              )}
            >
              <ScenarioIcon icon={item.icon} className="h-[1.15rem] w-[1.15rem]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[0.9375rem] font-semibold leading-tight text-[#0F172A]">{item.title}</h3>
              <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-[#475569]">{item.description}</p>
              {item.estimatedMinutes || (!hideBrowseLevel && item.levelSupport.length > 0) ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-[#64748B]">
                  {item.estimatedMinutes ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock3 className="h-3 w-3 opacity-60" aria-hidden />
                      {item.estimatedMinutes} min
                    </span>
                  ) : null}
                  {!hideBrowseLevel && item.levelSupport.length > 0 ? (
                    <span className="tabular-nums">{item.levelSupport.join(' · ')}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <ChevronRight
              className={clsx('h-5 w-5 shrink-0 opacity-80', selected ? 'text-[#6d28d9]' : 'text-[#CBD5E1]')}
              aria-hidden
            />
          </div>
        </Card>
      </div>
    )
  }

  const selectedStatusStrip = selected ? (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-medium text-[#1E40AF]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Selected
      </span>
      {resolvedLayout === 'browseFeatured' ? (
        <span className="text-[11px] font-medium text-[#64748B]">Fine-tune below, then begin</span>
      ) : isLive ? (
        <span className="text-[11px] font-medium text-[#166534]">Tap again to restart</span>
      ) : isCoach ? (
        <span className="text-[11px] font-medium text-[#6D28D9]">Future mode</span>
      ) : (
        <span className="text-[11px] font-medium text-[#64748B]">Previewing</span>
      )}
    </div>
  ) : null

  const isFeaturedBrowse = resolvedLayout === 'browseFeatured'
  const isCompact = resolvedLayout === 'compact'

  /** `browseRow` already returned above, so by this point `resolvedLayout` is one of the remaining variants. */
  const heroImage =
    !isCompact && item.imageSrc ? (
      <div
        className={clsx(
          'relative mb-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-slate-50/40',
          isFeaturedBrowse
            ? 'aspect-video max-h-[12.5rem] w-full sm:max-h-[13.5rem]'
            : selected
              ? 'aspect-[2.4/1] max-h-[9.5rem] sm:max-h-[10.5rem]'
              : 'aspect-[2.2/1]'
        )}
      >
        <Image
          src={item.imageSrc}
          alt={item.imageAlt ?? item.title}
          fill
          sizes="(max-width: 640px) 100vw, 28rem"
          className="object-cover"
        />
      </div>
    ) : null

  const showGoals = !isCompact && !isFeaturedBrowse

  const showAvailabilityChip = !(isLive && hideLiveAvailability)

  return (
    <div
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${item.title}. ${selected ? 'Selected.' : isLive ? 'Press Enter to start this live session.' : 'Press Enter to select this scenario.'}`}
      onClick={selectThisCard}
      onKeyDown={onCardSurfaceKeyDown}
      className="block w-full min-h-touch rounded-[inherit] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/35 focus-visible:ring-offset-2"
    >
      <Card
        variant="outlined"
        padding="none"
        className={clsx(
          'relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white transition-all duration-200',
          isFeaturedBrowse
            ? 'shadow-[0_8px_32px_-22px_rgba(15,23,42,0.08)] hover:border-[#CBD5E1]'
            : isCompact
              ? 'hover:border-[#CBD5E1] hover:shadow-[0_6px_22px_-14px_rgba(15,23,42,0.1)]'
              : 'hover:border-[#CBD5E1] hover:shadow-[0_10px_28px_-18px_rgba(15,23,42,0.12)]',
          'active:scale-[0.995]',
          !isLive && 'bg-white/98',
          selected
            ? isFeaturedBrowse
              ? 'border-[#93C5FD] ring-1 ring-[#BFDBFE]/80 shadow-[0_8px_28px_-20px_rgba(37,99,235,0.1)]'
              : clsx(accent.selected, 'ring-1 ring-inset ring-white/70')
            : isLive && !isFeaturedBrowse
              ? 'border-[#BBF7D0]/90 bg-white'
              : ''
        )}
      >
        <div
          className={clsx(
            'absolute inset-0 bg-gradient-to-br',
            isFeaturedBrowse ? 'opacity-[0.14]' : isCompact ? 'opacity-55' : 'opacity-75',
            accent.surface
          )}
          aria-hidden
        />
        <div className={clsx('relative', isCompact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5')}>
          <>
            {heroImage}
            {selectedStatusStrip}
          </>

          <div className={clsx('flex items-start', isCompact ? 'gap-2.5' : 'gap-3')}>
            <div
              className={clsx(
                isCompact
                  ? 'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-[#E5E7EB]/60'
                  : 'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-[#E5E7EB]/60',
                accent.icon
              )}
            >
              <ScenarioIcon icon={item.icon} className={isCompact ? 'h-4.5 w-4.5' : 'h-5 w-5'} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3
                  className={clsx(
                    isCompact ? 'text-body-sm font-semibold' : 'text-body font-semibold',
                    'text-ink-primary'
                  )}
                >
                  {item.title}
                </h3>
                {!hideCategory ? (
                  <span
                    className={clsx(
                      'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      isCompact && 'bg-white/85',
                      accent.chip
                    )}
                  >
                    {item.category}
                  </span>
                ) : null}
                {item.specialLabel ? (
                  <span className="inline-flex rounded-full border border-violet-200/70 bg-[#F3E8FF] px-2 py-0.5 text-[11px] font-medium text-[#6D28D9]">
                    {item.specialLabel}
                  </span>
                ) : null}
              </div>

              <p
                className={clsx(
                  'mt-1 text-ink-secondary leading-snug',
                  isFeaturedBrowse ? 'line-clamp-2 text-body-sm' : isCompact ? 'text-caption' : 'text-body-sm'
                )}
              >
                {item.description}
              </p>

              <div className={clsx('flex flex-wrap items-center gap-2 text-caption', isCompact ? 'mt-2' : 'mt-3')}>
                {showAvailabilityChip ? (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium',
                      isLive
                        ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]'
                        : 'border-[#E5E7EB] bg-slate-50/90 text-[#475569]'
                    )}
                  >
                    {isLive ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
                    {isLive ? 'Available now' : item.comingSoonLabel ?? 'Coming soon'}
                  </span>
                ) : null}

                {item.estimatedMinutes ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-slate-50/90 px-2 py-1 text-[11px] font-medium text-[#475569]">
                    <Clock3 className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    {item.estimatedMinutes} min
                  </span>
                ) : null}

                {!hideBrowseLevel && item.levelSupport.length > 0 ? (
                  <span className="inline-flex rounded-full border border-[#E5E7EB] bg-slate-50/90 px-2 py-1 text-[11px] font-medium text-[#475569]">
                    {item.levelSupport.join(' · ')}
                  </span>
                ) : null}
              </div>

              {showGoals ? <p className="mt-3 text-caption text-ink-secondary leading-snug">{item.goalsSummary}</p> : null}
            </div>

            <div className={clsx('shrink-0 text-[#CBD5E1]', isCompact ? 'pt-0.5' : 'pt-0.5')}>
              {selected ? (
                <CheckCircle2 className="h-5 w-5 text-[#6d28d9]" aria-hidden />
              ) : (
                <ChevronRight className={clsx(isCompact ? 'h-4.5 w-4.5' : 'h-5 w-5')} aria-hidden />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
