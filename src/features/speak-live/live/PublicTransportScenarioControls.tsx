'use client'

import { ChevronDown, Shuffle } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import { SpeakLiveQuickVariationStrip } from './SpeakLiveQuickVariationStrip'
import {
  PUBLIC_TRANSPORT_DESTINATION_PRESETS,
  PUBLIC_TRANSPORT_SUBTYPE_OPTIONS,
  PUBLIC_TRANSPORT_VARIATION_OPTIONS,
  type PublicTransportScenarioOverrides,
  type PublicTransportScenarioSubtype,
  type PublicTransportScenarioVariation,
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

export function PublicTransportScenarioControls({
  smartMode,
  overrides,
  customizeOpen,
  presetLocked,
  onSmartModeChange,
  onOverridesChange,
  onCustomizeOpenChange,
}: {
  smartMode: boolean
  overrides: PublicTransportScenarioOverrides
  customizeOpen: boolean
  /** Classic “Train (station)” tile: fixed train + route/platform; only optional destination. */
  presetLocked?: boolean
  onSmartModeChange: (next: boolean) => void
  onOverridesChange: (next: PublicTransportScenarioOverrides) => void
  onCustomizeOpenChange: (next: boolean) => void
}) {
  function syncSmartModeFromOverrides(next: PublicTransportScenarioOverrides) {
    if (presetLocked) {
      onSmartModeChange(false)
      return
    }
    if (!next.subType && !next.variation && !next.destination) {
      onSmartModeChange(true)
      onCustomizeOpenChange(false)
    } else {
      onSmartModeChange(false)
      onCustomizeOpenChange(Boolean(next.subType || next.destination))
    }
  }

  const applySubtype = (id: PublicTransportScenarioSubtype) => {
    if (presetLocked) return
    const nextSub = overrides.subType === id ? undefined : id
    const next: PublicTransportScenarioOverrides = {
      ...(nextSub ? { subType: nextSub } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
      ...(overrides.destination ? { destination: overrides.destination } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyVariation = (id: PublicTransportScenarioVariation) => {
    if (presetLocked) return
    const nextVar = overrides.variation === id ? undefined : id
    const next: PublicTransportScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVar ? { variation: nextVar } : {}),
      ...(overrides.destination ? { destination: overrides.destination } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyDestinationPreset = (destination: string) => {
    const nextDest = overrides.destination === destination ? undefined : destination
    const next: PublicTransportScenarioOverrides = presetLocked
      ? {
          subType: 'train',
          variation: 'route_and_platform',
          ...(nextDest ? { destination: nextDest } : {}),
        }
      : {
          ...(overrides.subType ? { subType: overrides.subType } : {}),
          ...(overrides.variation ? { variation: overrides.variation } : {}),
          ...(nextDest ? { destination: nextDest } : {}),
        }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const destinationMatchesPreset = (d: string) => overrides.destination === d

  const quickVariationOptions = PUBLIC_TRANSPORT_VARIATION_OPTIONS.map((o) => ({ id: o.id, label: o.label }))

  return (
    <div className="mt-4 space-y-3">
      {!presetLocked ? (
        <SpeakLiveQuickVariationStrip
          title="OV task"
          description="Random mixes vehicle and task. Pick one task (route, ticket, delays) while mode can still vary."
          randomSelected={smartMode}
          selectedVariationId={overrides.variation}
          options={quickVariationOptions}
          onPickRandom={() => {
            onSmartModeChange(true)
            onOverridesChange({})
            onCustomizeOpenChange(false)
          }}
          onToggleVariation={(id) => applyVariation(id as PublicTransportScenarioVariation)}
        />
      ) : null}

      <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/80 p-3.5">
        {!presetLocked ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <Shuffle className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div>
                  <p className="text-body-sm font-semibold text-ink-primary">Mix up the transport situation each time</p>
                  <p className="mt-0.5 text-caption text-ink-secondary leading-snug">
                    We vary the vehicle, task, and destination so practice stays realistic.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={smartMode}
              onClick={() => {
                playAppSound('tap')
                const next = !smartMode
                onSmartModeChange(next)
                if (next) {
                  onOverridesChange({})
                  onCustomizeOpenChange(false)
                }
              }}
              className={clsx(
                'shrink-0 rounded-xl px-3 py-2 text-caption font-bold transition-colors',
                smartMode ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-ink-secondary'
              )}
            >
              {smartMode ? 'On' : 'Off'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-caption leading-snug text-ink-secondary">
            <span className="font-semibold text-ink-primary">Classic train preset:</span> train · route / platform.
            Optional destination below still applies.
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            playAppSound('tap')
            onCustomizeOpenChange(!customizeOpen)
          }}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-body-sm font-semibold text-ink-primary hover:bg-slate-50"
        >
          <span>Customize this scenario</span>
          <ChevronDown
            className={clsx('h-4 w-4 shrink-0 text-ink-tertiary transition-transform', customizeOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {customizeOpen ? (
          <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
            {!presetLocked ? (
              <>
                <div>
                  <p className="text-caption font-bold uppercase tracking-wide text-ink-tertiary">Transport</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PUBLIC_TRANSPORT_SUBTYPE_OPTIONS.map((o) => (
                      <ChoicePill
                        key={o.id}
                        label={o.label}
                        selected={overrides.subType === o.id}
                        onClick={() => applySubtype(o.id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            <div>
              <p className="text-caption font-bold uppercase tracking-wide text-ink-tertiary">Destination</p>
              <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                Pick a typical goal — or clear your selection to drop the destination hint.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PUBLIC_TRANSPORT_DESTINATION_PRESETS.map((o) => (
                  <ChoicePill
                    key={o.id}
                    label={o.label}
                    selected={destinationMatchesPreset(o.destination)}
                    onClick={() => applyDestinationPreset(o.destination)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
