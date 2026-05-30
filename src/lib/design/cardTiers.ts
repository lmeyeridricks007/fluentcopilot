/**
 * Logged-in home surface tiers + native mobile interaction affordances.
 * @see docs/product/logged-in-visual-consistency-pass.md
 * @see docs/product/mobile-native-feel-pass.md
 * @see docs/product/home-production-polish-pass.md
 * @see docs/product/native-interaction-habit-loop-pass.md
 */

import { clsx } from 'clsx'

/** Tap feedback: reduce 300ms delay on iOS, subtle press scale */
export const nativePress =
  'touch-manipulation select-none active:scale-[0.98] active:opacity-95 transition-[transform,opacity] duration-100'

/** Full-width list row: background tint + micro-scale (no “floating button” jump) */
export const listRowPress =
  'touch-manipulation select-none transition-[background-color,transform] duration-100 active:scale-[0.995] active:bg-slate-100/95'

/** Full-surface card link: light shrink + brightness (exam mode, banners) */
export const cardSurfacePress =
  'touch-manipulation select-none transition-[transform,filter] duration-100 active:scale-[0.99] active:brightness-[0.97]'

/**
 * Tier-1 hero shell — single source of truth for the violet brand gradient
 * used by `NextBestActionHero` and `ResumeContinueCard` (`variant="hero"`).
 * Mirrors `bg-brand-gradient` (violet → indigo, see `tailwind.config.js`) but
 * extends to `slate-900` for the premium dark-anchor look.
 *
 * Shape only — callers add padding, type, and the inner glow blobs.
 */
export const heroShellClass = clsx(
  'rounded-2xl bg-gradient-to-br from-primary-600 via-primary-800 to-slate-900',
  'shadow-[0_20px_52px_-14px_rgba(76,29,149,0.45)] ring-1 ring-white/12'
)

/**
 * White CTA on dark hero — high dominance, tactile press (shadow collapses on active).
 * Compose with sizing classes in the component.
 */
export const heroPrimaryCta = clsx(
  'inline-flex items-center justify-center gap-1.5 w-full',
  'rounded-xl font-bold text-ink-primary bg-white',
  'shadow-[0_10px_32px_-8px_rgba(0,0,0,0.52)] ring-2 ring-white/90',
  'transition-[transform,box-shadow,background-color,filter] duration-150 ease-out',
  'active:scale-[0.97] active:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.4)] active:bg-primary-50'
)

/** Primary CTA on light surfaces (practical, lesson row, etc.). Shadow uses violet rgba to match `bg-primary-600`. */
export const surfacePrimaryCta = clsx(
  'inline-flex items-center justify-center gap-1.5 w-full',
  'rounded-xl font-bold text-white bg-primary-600',
  'shadow-[0_6px_22px_-6px_rgba(124,58,237,0.55)] ring-1 ring-primary-500/55',
  'transition-[transform,box-shadow,background-color] duration-150 ease-out',
  'active:scale-[0.98] active:shadow-[0_3px_14px_-6px_rgba(124,58,237,0.45)] active:bg-primary-700'
)

/** Exam mode CTA — slightly deeper, “switch mode” weight. Shadow uses violet-700 rgba to match `bg-primary-700`. */
export const examModeCta = clsx(
  'inline-flex items-center justify-center gap-1 w-full',
  'rounded-xl font-bold text-white bg-primary-700',
  'shadow-[0_8px_26px_-8px_rgba(109,40,217,0.6)] ring-1 ring-primary-400/45',
  'transition-[transform,box-shadow,background-color] duration-150 ease-out',
  'active:scale-[0.98] active:shadow-[0_4px_16px_-8px_rgba(109,40,217,0.5)] active:bg-primary-800'
)

/** System summary band — lightweight, not a card */
export const statusBandClass =
  'rounded-xl bg-gradient-to-b from-slate-100/65 to-slate-100/40 px-3 py-1.5 sm:py-2 ring-1 ring-slate-200/40 shadow-none border-0'

/** Tier 2 — exam prep: “mode” framing with leading accent bar */
export const tier2ExamShell = (emphasis: 'primary' | 'secondary') =>
  emphasis === 'primary'
    ? 'rounded-2xl py-4 pl-4 pr-4 sm:pl-5 sm:pr-5 bg-gradient-to-br from-slate-50 via-primary-50/60 to-primary-100/30 border-l-[4px] border-l-primary-600 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12),inset_0_1px_0_0_rgba(255,255,255,0.7)] ring-1 ring-primary-200/50 border-y-0 border-r-0 border-t-0'
    : 'rounded-2xl py-4 px-4 sm:px-5 bg-gradient-to-br from-primary-50/65 to-slate-50/85 border-l-[3px] border-l-primary-500/85 ring-1 ring-primary-100/75 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]'

/** Tier 2 — practical / everyday — visually quieter than hero + exam */
export const tier2PracticalShell =
  'rounded-2xl p-4 sm:p-4 bg-surface-elevated ring-1 ring-slate-200/50 shadow-[0_1px_4px_rgba(15,23,42,0.06)]'

/** Tier 2b — practice hub as standalone row (Home may embed in list instead) */
export const tier2PracticeHubRow =
  'rounded-2xl p-4 bg-gradient-to-br from-slate-50 via-surface-elevated to-primary-50/25 ring-1 ring-slate-200/50 shadow-sm'

/** Tier 3 — review / maintenance (standalone card) */
export const tier3ReviewShell = (accent?: 'primary' | 'amber') => {
  if (accent === 'primary')
    return 'rounded-xl bg-primary-50/35 ring-1 ring-primary-200/35 border-0 shadow-none'
  if (accent === 'amber')
    return 'rounded-xl bg-amber-50/25 ring-1 ring-amber-200/35 border-0 shadow-none'
  return 'rounded-xl bg-surface-muted/60 ring-1 ring-slate-200/30 border-0 shadow-none'
}

/** Tier 3 — utility / quick-action list container (native grouped list) */
export const tier3UtilityListShell =
  'rounded-xl bg-surface-muted/40 ring-1 ring-slate-200/30 overflow-hidden divide-y divide-slate-200/35 border-0 shadow-none'

/** Single row inside grouped list — thumb-friendly tappable row */
export const tier3UtilityRow = clsx(
  'flex w-full items-center gap-3 min-h-[52px] px-3.5 py-2.5 text-left',
  'hover:bg-surface-elevated/90 active:bg-surface-elevated',
  nativePress
)

/** Home “Keep going” — denser iOS-style continuation rows */
export const tier3KeepGoingRow = clsx(
  'flex w-full items-center gap-2.5 min-h-[46px] px-3 py-1.5 text-left',
  'hover:bg-surface-elevated/75',
  listRowPress
)

/** Secondary utility links — lighter, clearly demoted */
export const tier3ShortcutRow = clsx(
  'flex w-full items-center gap-2.5 min-h-[44px] px-2.5 py-1.5 text-left',
  'hover:bg-surface-elevated/70',
  listRowPress
)
