'use client'

import Link from 'next/link'
import {
  BookMarked,
  Camera,
  ClipboardPaste,
  MapPin,
  MessageSquareWarning,
  Mic,
  Type,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { QuickCaptureApiStatus, QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import { Button } from '@/components/ui/Button'
import { APP_LIBRARY_FROM_YOUR_DAY, appLibraryCaptureDetailHref } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { captureDisplayTitle, capturePreviewText, parseQuickCaptureEnrichment, typeLabel } from './parseQuickCaptureEnrichment'

const TYPE_ICONS = {
  save_word: Type,
  save_phrase: BookMarked,
  photo_text: Camera,
  add_place: MapPin,
  paste_text: ClipboardPaste,
  log_struggle: MessageSquareWarning,
  voice_note: Mic,
} as const

function readinessMeta(status: QuickCaptureApiStatus): { label: string; tone: 'neutral' | 'info' | 'success' | 'muted' | 'warn' } {
  switch (status) {
    case 'new':
      return { label: 'New', tone: 'info' }
    case 'enriched':
      return { label: 'Finishing up', tone: 'neutral' }
    case 'ready_for_practice':
      return { label: 'Ready to practice', tone: 'success' }
    case 'included_in_practice':
      return { label: 'Included in pack', tone: 'info' }
    case 'practiced':
      return { label: 'Practiced', tone: 'muted' }
    case 'saved_long_term':
      return { label: 'Saved long-term', tone: 'success' }
    case 'archived':
      return { label: 'Archived', tone: 'muted' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function placeLine(item: QuickCaptureItem): string | null {
  if (item.captureType !== 'add_place' && !item.placeKind) return null
  if (item.captureType === 'add_place' && (item.bodyPrimary ?? '').trim()) {
    return (item.bodyPrimary ?? '').trim()
  }
  if (item.placeKind) {
    return item.placeKind.replace(/_/g, ' ')
  }
  return null
}

export function CaptureItemCard({
  item,
  onArchive,
  onSaveLongTerm,
  busyId,
}: {
  item: QuickCaptureItem
  onArchive?: (id: string) => void
  onSaveLongTerm?: (id: string) => void
  busyId?: string | null
}) {
  const enrichment = parseQuickCaptureEnrichment(item)
  const title = captureDisplayTitle(item)
  const preview = capturePreviewText(item, enrichment)
  const Icon = TYPE_ICONS[item.captureType] ?? Type
  const badge = readinessMeta(item.status)
  const place = placeLine(item)
  const ctx =
    enrichment?.scenarioSlugGuess?.replace(/-/g, ' ') ??
    (enrichment?.likelyScenario ? enrichment.likelyScenario.slice(0, 48) : null)

  const canPractice = item.status === 'ready_for_practice' || item.status === 'included_in_practice'
  const fromDayHref = `${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(item.localCaptureDate)}`
  const busy = busyId === item.id

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-3.5 shadow-sm ring-1 ring-slate-900/[0.02] transition-shadow hover:shadow-md">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-800 ring-1 ring-primary-100/80">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{typeLabel(item.captureType)}</span>
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                badge.tone === 'success' && 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100',
                badge.tone === 'info' && 'bg-violet-50 text-violet-900 ring-1 ring-violet-100',
                badge.tone === 'neutral' && 'bg-amber-50 text-amber-950 ring-1 ring-amber-100/80',
                badge.tone === 'muted' && 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80',
                badge.tone === 'warn' && 'bg-orange-50 text-orange-900 ring-1 ring-orange-100',
              )}
            >
              {badge.label}
            </span>
            {enrichment?.needsReview ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-900 ring-1 ring-violet-100">
                Review
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-body-sm font-semibold text-ink-primary leading-snug line-clamp-2">{title}</h3>
          <p className="mt-1 text-caption text-ink-secondary leading-relaxed line-clamp-2">{preview}</p>
          <p className="mt-1.5 text-[11px] text-ink-tertiary">{formatWhen(item.createdAt)}</p>
          {(place || ctx) && (
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
              {place ? <span className="font-medium text-slate-600">{place}</span> : null}
              {place && ctx ? <span aria-hidden> · </span> : null}
              {ctx ? <span>{ctx}</span> : null}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {canPractice ? (
          <Link
            href={fromDayHref}
            onClick={() => playAppSound('tap')}
            className="inline-flex min-h-touch w-full items-center justify-center rounded-xl bg-primary-600 px-3 py-2.5 text-caption font-bold text-white shadow-sm hover:bg-primary-700"
          >
            Ready to practice
          </Link>
        ) : null}
        <Link
          href={appLibraryCaptureDetailHref(item.id)}
          onClick={() => playAppSound('tap')}
          className={clsx(
            'inline-flex min-h-touch w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-caption font-semibold text-ink-primary',
            !canPractice && 'bg-surface-muted/40',
          )}
        >
          View details
          <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
        </Link>
        {item.status !== 'archived' ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-0.5">
            {item.status !== 'saved_long_term' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  playAppSound('tap')
                  onSaveLongTerm?.(item.id)
                }}
              >
                Keep
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => {
                playAppSound('tap')
                onArchive?.(item.id)
              }}
            >
              Archive
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
