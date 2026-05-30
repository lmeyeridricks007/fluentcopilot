'use client'

import Image from 'next/image'
import { clsx } from 'clsx'
import { TRAIN_STATION_SPEAK_LIVE_HERO_SRC } from '../speakLiveScenarios'

export type SpeakLiveVisualTone = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused'

export type SpeakLiveConductorPresentingGender = 'male' | 'female'
const CONDUCTOR_MALE_SRC = '/speak-live/conductor-male.png'
const CONDUCTOR_FEMALE_SRC = '/speak-live/conductor-female.png'

function isTrainScenario(scenarioId: string): boolean {
  return scenarioId.toLowerCase().includes('train')
}

function conductorSrc(gender: SpeakLiveConductorPresentingGender): string {
  return gender === 'male' ? CONDUCTOR_MALE_SRC : CONDUCTOR_FEMALE_SRC
}

function StationBackdropPhoto({ className }: { className?: string }) {
  return (
    <div className={clsx('absolute inset-0', className)}>
      <Image
        src={TRAIN_STATION_SPEAK_LIVE_HERO_SRC}
        alt=""
        fill
        priority
        sizes="(max-width: 640px) 100vw, 28rem"
        className="object-cover object-center"
        aria-hidden
      />
    </div>
  )
}

function ConductorPortraitPhoto({
  gender,
  className,
  sizes,
}: {
  gender: SpeakLiveConductorPresentingGender
  className?: string
  sizes: string
}) {
  return (
    <div className={clsx('relative h-full w-full', className)}>
      <Image
        src={conductorSrc(gender)}
        alt=""
        fill
        priority
        sizes={sizes}
        className="object-cover object-[center_18%] sm:object-[center_15%]"
        aria-hidden
      />
    </div>
  )
}

function toneRingClasses(tone: SpeakLiveVisualTone, slim: boolean): string {
  if (slim) {
    return clsx(
      tone === 'listening' && 'ring-1 ring-emerald-300/40 ring-offset-1 ring-offset-[#fafaf7]',
      tone === 'processing' && 'ring-1 ring-amber-200/50 ring-offset-1 ring-offset-[#fafaf7]',
      tone === 'speaking' && 'ring-1 ring-violet-300/35 ring-offset-1 ring-offset-[#fafaf7]',
      tone === 'paused' && 'opacity-80 grayscale-[0.25]'
    )
  }
  return clsx(
    tone === 'listening' && 'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-white',
    tone === 'processing' && 'ring-2 ring-amber-300/40 ring-offset-2 ring-offset-white',
    tone === 'speaking' && 'ring-2 ring-violet-300/45 ring-offset-2 ring-offset-white',
    tone === 'paused' && 'opacity-75 grayscale-[0.35]'
  )
}

export function SpeakLiveTrainStationVisual({
  scenarioId,
  tone,
  compact = false,
  slim = true,
  title,
  body,
  className,
  /** Match assistant TTS presentation; default male for current train-station voice. */
  conductorPresentingGender = 'male',
}: {
  scenarioId: string
  tone: SpeakLiveVisualTone
  compact?: boolean
  slim?: boolean
  title?: string
  body?: string
  className?: string
  conductorPresentingGender?: SpeakLiveConductorPresentingGender
}) {
  if (!isTrainScenario(scenarioId)) return null

  if (compact) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-slate-900',
          tone === 'idle' && 'shadow-[0_12px_30px_-24px_rgba(15,23,42,0.22)]',
          tone === 'listening' && 'border-emerald-300 shadow-[0_0_36px_-12px_rgba(52,211,153,0.45)]',
          tone === 'processing' && 'border-amber-300 shadow-[0_0_32px_-12px_rgba(251,191,36,0.32)]',
          tone === 'speaking' && 'border-violet-300 shadow-[0_0_38px_-12px_rgba(167,139,250,0.34)]',
          tone === 'paused' && 'grayscale opacity-70',
          className,
        )}
      >
        <StationBackdropPhoto />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),transparent_55%)]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-white/25" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 top-[8%]">
          <ConductorPortraitPhoto gender={conductorPresentingGender} sizes="180px" />
        </div>
      </div>
    )
  }

  if (slim) {
    return (
      <section
        className={clsx(
          'relative isolate flex min-h-[4.75rem] w-full shrink-0 overflow-hidden rounded-xl border border-[#E5E7EB]/90 bg-[#fafaf7]/95 shadow-sm sm:min-h-[5rem] sm:rounded-2xl',
          toneRingClasses(tone, true),
          className,
        )}
        aria-hidden
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-2 text-left sm:px-3 sm:py-2.5">
          <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#94A3B8]">Train conductor</p>
          <p className="mt-0.5 line-clamp-1 text-[0.875rem] font-semibold leading-snug tracking-tight text-[#0F172A] sm:text-[0.9375rem]">
            {title ?? 'Live call mode'}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-[#64748B] sm:text-[11px]">
            {body ?? 'Speak as if you are at a Dutch station help desk. The conductor stays on screen while you talk.'}
          </p>
        </div>
        <div className="relative w-[26%] max-w-[6.75rem] shrink-0 self-stretch bg-slate-200/80">
          <div className="absolute inset-0">
            <StationBackdropPhoto className="opacity-35" />
          </div>
          <div className="relative h-full min-h-[4.75rem] w-full sm:min-h-[5rem]">
            <ConductorPortraitPhoto
              gender={conductorPresentingGender}
              className="opacity-[0.94]"
              sizes="(max-width:640px) 28vw, 6.5rem"
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={clsx(
        'relative isolate h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)] sm:rounded-[2rem]',
        className,
      )}
      aria-hidden
    >
      <StationBackdropPhoto />
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/82 to-white/25" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent" aria-hidden />

      <div className="relative z-10 grid h-full min-h-0 grid-cols-[minmax(0,1fr)_40%] items-stretch sm:grid-cols-[minmax(0,1fr)_44%]">
        <div className="flex min-h-0 flex-col justify-end px-4 py-3 text-left sm:px-5 sm:py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-tertiary drop-shadow-sm sm:text-[10px] sm:tracking-[0.18em]">
            Train conductor
          </p>
          <p className="mt-1.5 text-[1.2rem] font-semibold leading-[1.08] tracking-tight text-ink-primary drop-shadow-sm sm:mt-2 sm:text-[1.45rem]">
            {title ?? 'Live call mode'}
          </p>
          <p className="mt-1.5 max-w-[18rem] text-[12px] text-ink-secondary leading-snug drop-shadow-sm line-clamp-2 sm:mt-2 sm:text-[13px] sm:leading-relaxed sm:line-clamp-none">
            {body ?? 'Speak as if you are at a Dutch station help desk. The conductor stays on screen while you talk.'}
          </p>
        </div>
        <div className="relative min-h-0">
          <ConductorPortraitPhoto gender={conductorPresentingGender} sizes="(max-width:640px) 40vw, 200px" />
        </div>
      </div>
    </section>
  )
}
