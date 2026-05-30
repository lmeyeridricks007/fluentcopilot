'use client'

import { Briefcase, GraduationCap, HeartHandshake, MapPin, Sparkles, UserRound } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import type { LanguageCoachConversationRole } from '@/lib/api/languageCoachTypes'
import {
  getLanguageCoachRoleCard,
  LANGUAGE_COACH_ROLE_CARDS,
  languageCoachBestForPills,
} from './languageCoachRoleCatalog'

const ROLE_ICONS: Record<LanguageCoachConversationRole, typeof UserRound> = {
  friend: UserRound,
  colleague: Briefcase,
  dutch_local: MapPin,
  date: HeartHandshake,
  coach: GraduationCap,
}

type Props = {
  value: LanguageCoachConversationRole
  onChange: (role: LanguageCoachConversationRole) => void
}

export function LanguageCoachRoleModeSection({ value, onChange }: Props) {
  const selected = getLanguageCoachRoleCard(value)
  const bestPills = languageCoachBestForPills(selected.bestForTags)

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-900/90 shadow-sm">
            <Sparkles className="h-3 w-3 text-violet-600" aria-hidden />
            Role mode
          </div>
          <h2 className="mt-3 text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.5rem]">
            Who you&apos;re talking to
          </h2>
          <p className="mt-2 max-w-[28rem] text-[14px] leading-relaxed text-slate-600">
            Same live voice session — choose a conversation partner. Each role changes tone, follow-ups, and how much
            you&apos;re steered. Coach stays the strongest path for learning.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LANGUAGE_COACH_ROLE_CARDS.map((r) => {
          const Icon = ROLE_ICONS[r.id]
          const active = value === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                playAppSound('tap')
                onChange(r.id)
              }}
              className={clsx(
                'group relative min-h-touch text-left transition-all duration-300',
                'rounded-[1.25rem] border px-4 py-4 sm:px-5 sm:py-4',
                active
                  ? 'border-violet-400/95 bg-white shadow-[0_20px_50px_-28px_rgba(109,40,217,0.42),0_0_0_1px_rgba(167,139,250,0.35)_inset] ring-2 ring-violet-200/80'
                  : 'border-slate-200/85 bg-white/55 shadow-[0_8px_30px_-22px_rgba(15,23,42,0.12)] hover:border-violet-200/90 hover:bg-white/90 hover:shadow-[0_16px_40px_-24px_rgba(109,40,217,0.18)]',
              )}
            >
              {active ? (
                <span
                  className="absolute right-3 top-3 h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.2)]"
                  aria-hidden
                />
              ) : null}
              <div className="flex gap-3.5">
                <span
                  className={clsx(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300',
                    active
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-violet-50 group-hover:text-violet-800',
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[16px] font-semibold tracking-tight text-slate-900">{r.title}</span>
                    <span
                      className={clsx(
                        'text-[11px] font-medium uppercase tracking-wide',
                        active ? 'text-violet-700/90' : 'text-slate-400',
                      )}
                    >
                      {r.toneDescriptor}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-slate-600">{r.subtitle}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{r.vibe}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div
        className={clsx(
          'mt-5 overflow-hidden rounded-[1.35rem] border transition-all duration-300',
          'border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/40',
          'shadow-[0_16px_48px_-32px_rgba(67,56,202,0.35)]',
        )}
      >
        <div className="border-b border-indigo-100/80 bg-white/50 px-5 py-3.5 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-900/70">Selected role</p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-indigo-950">{selected.title}</p>
          <p className="mt-1 text-[12px] font-medium text-violet-900/80">{selected.toneDescriptor}</p>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">What it feels like</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">{selected.detailFeel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">How it challenges you</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">{selected.challengeLine}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Best for</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bestPills.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-indigo-950 shadow-sm"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-slate-600">{selected.bestForSummary}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Style</p>
            <p className="mt-1 text-[14px] font-medium leading-relaxed text-slate-800">{selected.styleLine}</p>
            {selected.coachGuideHint ? (
              <p className="mt-2 border-t border-slate-100 pt-2 text-[13px] leading-relaxed text-violet-900/90">
                {selected.coachGuideHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
