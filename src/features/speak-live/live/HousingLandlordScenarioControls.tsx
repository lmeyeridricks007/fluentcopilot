'use client'

import { ChevronDown, Shuffle } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import {
  HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS,
  HOUSING_LANDLORD_SUBTYPE_OPTIONS,
  HOUSING_LANDLORD_VARIATION_OPTIONS,
  type HousingLandlordScenarioOverrides,
  type HousingLandlordScenarioSubtype,
  type HousingLandlordScenarioVariation,
  type HousingLandlordDetailFocusId,
} from '../speakLiveScenarios'

const CONTRACT_FOCUS_IDS = new Set<string>(
  HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS.filter((t) => t.variation === 'asking_rent_contract').map((t) => t.id)
)

const ISSUE_FOCUS_IDS = new Set<string>(
  HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS.filter((t) => t.variation === 'reporting_issue').map((t) => t.id)
)

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
        'min-h-touch rounded-2xl border px-3.5 py-2 text-body-sm font-semibold transition-colors duration-150',
        selected
          ? 'border-primary-400/90 bg-white text-primary-950 shadow-[0_12px_28px_-18px_rgba(59,130,246,0.45)]'
          : 'border-slate-200/90 bg-white/90 text-ink-secondary hover:border-primary-200/90 hover:bg-white hover:text-ink-primary'
      )}
    >
      {label}
    </button>
  )
}

export function HousingLandlordScenarioControls({
  smartMode,
  overrides,
  customizeOpen,
  onSmartModeChange,
  onOverridesChange,
  onCustomizeOpenChange,
}: {
  smartMode: boolean
  overrides: HousingLandlordScenarioOverrides
  customizeOpen: boolean
  onSmartModeChange: (next: boolean) => void
  onOverridesChange: (next: HousingLandlordScenarioOverrides) => void
  onCustomizeOpenChange: (next: boolean) => void
}) {
  function syncSmartModeFromOverrides(next: HousingLandlordScenarioOverrides) {
    if (!next.subType && !next.variation && !next.detailFocus) {
      onSmartModeChange(true)
      onCustomizeOpenChange(false)
    } else {
      onSmartModeChange(false)
      onCustomizeOpenChange(Boolean(next.subType || next.variation || next.detailFocus))
    }
  }

  function sanitizeDetailForVariation(
    variation: HousingLandlordScenarioVariation | undefined,
    detail: HousingLandlordDetailFocusId | undefined
  ): HousingLandlordDetailFocusId | undefined {
    if (!variation || !detail) return detail
    if (variation === 'reporting_issue' && CONTRACT_FOCUS_IDS.has(detail)) return undefined
    if (variation === 'asking_rent_contract' && ISSUE_FOCUS_IDS.has(detail)) return undefined
    return detail
  }

  const applySubtype = (id: HousingLandlordScenarioSubtype) => {
    const nextSub = overrides.subType === id ? undefined : id
    const next: HousingLandlordScenarioOverrides = {
      ...(nextSub ? { subType: nextSub } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
      ...(overrides.detailFocus ? { detailFocus: overrides.detailFocus } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyVariation = (id: HousingLandlordScenarioVariation) => {
    const nextVar = overrides.variation === id ? undefined : id
    const nextDf =
      nextVar === undefined ? undefined : sanitizeDetailForVariation(nextVar, overrides.detailFocus)
    const next: HousingLandlordScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVar ? { variation: nextVar } : {}),
      ...(nextDf ? { detailFocus: nextDf } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyTopic = (id: HousingLandlordDetailFocusId) => {
    const meta = HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS.find((t) => t.id === id)
    if (!meta) return
    const isActive = overrides.detailFocus === id && overrides.variation === meta.variation
    const nextDf: HousingLandlordDetailFocusId | undefined = isActive ? undefined : id
    const nextVar: HousingLandlordScenarioVariation | undefined =
      nextDf !== undefined ? meta.variation : overrides.variation
    const next: HousingLandlordScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVar ? { variation: nextVar } : {}),
      ...(nextDf ? { detailFocus: nextDf } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const hasOverrides = Boolean(overrides.subType || overrides.variation || overrides.detailFocus)

  return (
    <div className="mt-4 space-y-3">
      <div
        className={clsx(
          'rounded-[1.45rem] border p-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)]',
          smartMode
            ? 'border-primary-200/70 bg-gradient-to-br from-white via-primary-50/40 to-white'
            : 'border-slate-200/80 bg-white/90'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className={clsx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                  smartMode ? 'border-primary-200/80 bg-white text-primary-700' : 'border-slate-200/80 bg-slate-50 text-slate-600'
                )}
              >
                <Shuffle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink-primary">Mix up the housing situation each time</p>
                <p className="text-caption text-ink-secondary mt-0.5 leading-relaxed">
                  {smartMode
                    ? 'We vary the housing problem or contract topic so practice stays realistic.'
                    : 'You chose specific options — this run follows your pins below.'}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={smartMode}
            aria-label="Smart mix for housing scenario"
            onClick={() => {
              playAppSound('tap')
              onSmartModeChange(!smartMode)
              if (!smartMode) {
                onOverridesChange({})
                onCustomizeOpenChange(false)
              }
            }}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
              smartMode ? 'border-primary-300/80 bg-white text-primary-900' : 'border-slate-200 bg-white text-ink-secondary'
            )}
          >
            {smartMode ? 'On' : 'Off'}
          </button>
        </div>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white/90 px-3.5 py-2.5 text-left text-body-sm font-semibold text-ink-primary transition-colors hover:border-primary-200/80 hover:bg-white"
          onClick={() => {
            playAppSound('tap')
            onCustomizeOpenChange(!customizeOpen)
          }}
          aria-expanded={customizeOpen}
        >
          <span>Customize this scenario</span>
          <ChevronDown className={clsx('h-4 w-4 shrink-0 transition-transform', customizeOpen ? 'rotate-180' : '')} aria-hidden />
        </button>

        {customizeOpen ? (
          <div className="mt-3 space-y-5 border-t border-slate-200/80 pt-4">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-tertiary">Type</p>
              <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">Who you are speaking with in this run.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOUSING_LANDLORD_SUBTYPE_OPTIONS.map((o) => (
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
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-tertiary">Focus</p>
              <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">Repair report or a rent / contract question.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOUSING_LANDLORD_VARIATION_OPTIONS.map((o) => (
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
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-tertiary">Optional topic</p>
              <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
                Pins a concrete angle. If it does not match your focus, the server maps to the closest valid option.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS.map((o) => (
                  <ChoicePill
                    key={o.id}
                    label={o.label}
                    selected={overrides.detailFocus === o.id && overrides.variation === o.variation}
                    onClick={() => applyTopic(o.id)}
                  />
                ))}
              </div>
            </div>
            {hasOverrides ? (
              <button
                type="button"
                className="text-caption font-semibold text-primary-700 hover:text-primary-900"
                onClick={() => {
                  playAppSound('tap')
                  onOverridesChange({})
                  onSmartModeChange(true)
                  onCustomizeOpenChange(false)
                }}
              >
                Clear all overrides
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
