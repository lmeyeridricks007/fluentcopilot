'use client'

import { ChevronDown, Shuffle } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import {
  DOCTOR_PHARMACY_LAUNCHER_FOCUS_OPTIONS,
  DOCTOR_PHARMACY_LAUNCHER_SETTING_OPTIONS,
  DOCTOR_PHARMACY_LAUNCHER_TOPIC_OPTIONS,
  type DoctorPharmacyHealthFocusId,
  type DoctorPharmacyScenarioOverrides,
  type DoctorPharmacyScenarioSubtype,
  type DoctorPharmacyScenarioVariation,
} from '../speakLiveScenarios'

function ChoicePill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playAppSound('tap')
        onClick()
      }}
      className={clsx(
        'min-h-touch rounded-2xl border px-3.5 py-2 text-body-sm font-semibold transition-colors',
        selected
          ? 'border-primary-400 bg-white text-primary-950 shadow-[0_10px_24px_-18px_rgba(59,130,246,0.5)]'
          : 'border-slate-200 bg-white text-ink-secondary hover:border-primary-200 hover:text-ink-primary'
      )}
    >
      {label}
    </button>
  )
}

export function DoctorPharmacyScenarioControls({
  smartMode,
  overrides,
  customizeOpen,
  onSmartModeChange,
  onOverridesChange,
  onCustomizeOpenChange,
}: {
  smartMode: boolean
  overrides: DoctorPharmacyScenarioOverrides
  customizeOpen: boolean
  onSmartModeChange: (next: boolean) => void
  onOverridesChange: (next: DoctorPharmacyScenarioOverrides) => void
  onCustomizeOpenChange: (next: boolean) => void
}) {
  function syncSmartModeFromOverrides(next: DoctorPharmacyScenarioOverrides) {
    if (!next.subType && !next.variation && !next.detailFocus) {
      onSmartModeChange(true)
      onCustomizeOpenChange(false)
    } else {
      onSmartModeChange(false)
      onCustomizeOpenChange(Boolean(next.subType || next.variation || next.detailFocus))
    }
  }

  const applySubtype = (id: DoctorPharmacyScenarioSubtype) => {
    const nextSub = overrides.subType === id ? undefined : id
    const next: DoctorPharmacyScenarioOverrides = {
      ...(nextSub ? { subType: nextSub } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
      ...(overrides.detailFocus ? { detailFocus: overrides.detailFocus } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyVariation = (id: DoctorPharmacyScenarioVariation) => {
    const nextVar = overrides.variation === id ? undefined : id
    const next: DoctorPharmacyScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVar ? { variation: nextVar } : {}),
      ...(overrides.detailFocus ? { detailFocus: overrides.detailFocus } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyTopic = (id: DoctorPharmacyHealthFocusId) => {
    const nextDf = overrides.detailFocus === id ? undefined : id
    const next: DoctorPharmacyScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
      ...(nextDf ? { detailFocus: nextDf } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-[1.45rem] border border-slate-200/90 bg-gradient-to-br from-white via-white to-violet-50/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-800 ring-1 ring-violet-100/90">
                <Shuffle className="h-[1.15rem] w-[1.15rem]" aria-hidden />
              </div>
              <div>
                <p className="text-body-sm font-semibold text-ink-primary tracking-tight">
                  Mix up the help situation each time
                </p>
                <p className="mt-1 text-caption text-ink-secondary leading-relaxed">
                  We vary the setting, symptom/help task, and response pattern so practice stays realistic.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={smartMode}
            aria-label="Smart mix: vary setting and task each session"
            onClick={() => {
              playAppSound('tap')
              const next = !smartMode
              onSmartModeChange(next)
              if (next) {
                onOverridesChange({})
                onCustomizeOpenChange(false)
              } else {
                onCustomizeOpenChange(false)
              }
            }}
            className={clsx(
              'relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors',
              smartMode ? 'border-primary-500 bg-primary-600' : 'border-slate-300 bg-slate-200'
            )}
          >
            <span
              className={clsx(
                'pointer-events-none absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform',
                smartMode ? 'translate-x-[1.3rem]' : 'translate-x-0.5'
              )}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="rounded-[1.45rem] border border-slate-200/85 bg-white/90 shadow-sm">
        <button
          type="button"
          onClick={() => {
            playAppSound('tap')
            onCustomizeOpenChange(!customizeOpen)
          }}
          className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          aria-expanded={customizeOpen}
        >
          <div>
            <p className="text-body-sm font-semibold text-ink-primary">Customize this scenario</p>
            <p className="mt-0.5 text-caption text-ink-secondary leading-snug">
              Optional — lock setting, focus, or a topic. Smart mix turns off while anything is selected.
            </p>
          </div>
          <ChevronDown
            className={clsx('h-4.5 w-4.5 shrink-0 text-ink-tertiary transition-transform', customizeOpen && 'rotate-180')}
            aria-hidden
          />
        </button>

        {customizeOpen ? (
          <div className="border-t border-slate-200/80 px-4 py-4">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Setting</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DOCTOR_PHARMACY_LAUNCHER_SETTING_OPTIONS.map((o) => (
                    <ChoicePill
                      key={o.id}
                      label={o.label}
                      selected={overrides.subType === o.id}
                      onClick={() => applySubtype(o.id)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Focus</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DOCTOR_PHARMACY_LAUNCHER_FOCUS_OPTIONS.map((o) => (
                    <ChoicePill
                      key={o.id}
                      label={o.label}
                      selected={overrides.variation === o.id}
                      onClick={() => applyVariation(o.id)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Optional topic</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DOCTOR_PHARMACY_LAUNCHER_TOPIC_OPTIONS.map((o) => (
                    <ChoicePill
                      key={o.id}
                      label={o.label}
                      selected={overrides.detailFocus === o.id}
                      onClick={() => applyTopic(o.id)}
                    />
                  ))}
                </div>
              </div>
              <p className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-caption leading-relaxed text-ink-tertiary">
                Clear every chip or turn smart mix on again to go back to full random — same launch flow as other live
                scenarios.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
