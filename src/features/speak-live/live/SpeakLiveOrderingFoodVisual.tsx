'use client'

import Image from 'next/image'
import { clsx } from 'clsx'
import type { SpeakLiveVisualTone } from './SpeakLiveTrainStationVisual'

function toneFrameClasses(tone: SpeakLiveVisualTone, slim: boolean): string {
  if (slim) {
    return clsx(
      tone === 'idle' && 'shadow-sm',
      tone === 'listening' && 'ring-1 ring-emerald-300/40 ring-offset-1 ring-offset-[#fafaf7]',
      tone === 'processing' && 'ring-1 ring-amber-200/50 ring-offset-1 ring-offset-[#fafaf7]',
      tone === 'speaking' && 'ring-1 ring-violet-300/35 ring-offset-1 ring-offset-[#fafaf7]',
      tone === 'paused' && 'opacity-80 grayscale-[0.25]'
    )
  }
  return clsx(
    tone === 'idle' && 'shadow-[0_8px_24px_-18px_rgba(15,23,42,0.1)]',
    tone === 'listening' && 'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-white',
    tone === 'processing' && 'ring-2 ring-amber-300/40 ring-offset-2 ring-offset-white',
    tone === 'speaking' && 'ring-2 ring-violet-300/45 ring-offset-2 ring-offset-white',
    tone === 'paused' && 'opacity-75 grayscale-[0.35]'
  )
}

export function SpeakLiveOrderingFoodVisual({
  imageSrc,
  tone,
  compact = false,
  /** Stacked image + caption — conversation-first layout (default on live screen). */
  slim = true,
  kicker = 'Bestellen',
  title,
  body,
  className,
  imageObjectClassName = 'object-cover object-center',
  /** Strong bottom scrim + light text for photoreal heroes (e.g. directions, public transport, booking). */
  captionReadable = false,
}: {
  imageSrc: string
  tone: SpeakLiveVisualTone
  compact?: boolean
  slim?: boolean
  /** Short scene label (e.g. Afhaal / Café) — matches venue hero image. */
  kicker?: string
  title?: string
  body?: string
  className?: string
  /** Tailwind object-* classes — counter-style photos often read better slightly right-of-center. */
  imageObjectClassName?: string
  captionReadable?: boolean
}) {
  if (compact) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-slate-900',
          toneFrameClasses(tone, false),
          className
        )}
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          sizes="180px"
          className="object-cover object-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.2),transparent_55%)]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-white/15" aria-hidden />
        {kicker.trim() ? (
          <div className="absolute left-3 top-3 z-[1] rounded-full bg-black/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {kicker}
          </div>
        ) : null}
      </div>
    )
  }

  if (slim) {
    return (
      <section
        className={clsx(
          'relative isolate flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-[#E5E7EB]/90 bg-white/90 shadow-sm sm:rounded-2xl',
          toneFrameClasses(tone, true),
          className
        )}
        aria-hidden
      >
        <div className="relative h-[11rem] w-full shrink-0 overflow-hidden bg-slate-200/80 sm:h-[12.5rem]">
          <Image
            src={imageSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 36rem"
            className={clsx('opacity-[0.92]', imageObjectClassName)}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/5"
            aria-hidden
          />
        </div>
        <div
          className={clsx(
            'flex w-full flex-col justify-center px-3 py-2.5 text-left sm:px-4 sm:py-3',
            captionReadable ? 'bg-slate-950/95 text-white' : 'bg-[#fafaf7]/95'
          )}
        >
          <p
            className={clsx(
              'text-[8px] font-medium uppercase tracking-[0.12em]',
              captionReadable ? 'text-white/70' : 'text-[#94A3B8]'
            )}
          >
            {kicker}
          </p>
          <p
            className={clsx(
              'mt-0.5 line-clamp-2 break-words text-[0.875rem] font-semibold leading-snug tracking-tight sm:text-[0.9375rem]',
              captionReadable ? 'text-white' : 'text-[#0F172A]'
            )}
          >
            {title ?? 'Live call mode'}
          </p>
          <p
            className={clsx(
              'mt-0.5 line-clamp-3 break-words text-[10px] leading-snug sm:text-[11px]',
              captionReadable ? 'text-white/85' : 'text-[#64748B]'
            )}
          >
            {body ??
              'Spreek in het Nederlands aan de balie. Gebruik de microfoon hieronder, of open Ondertiteling om het gesprek te lezen.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className={clsx(
        'relative isolate h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)] sm:rounded-[2rem]',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 36rem"
          className={clsx(imageObjectClassName)}
          aria-hidden
        />
      </div>
      {captionReadable ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/75 to-transparent sm:h-1/2" aria-hidden />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/48 to-transparent sm:from-white/90 sm:via-white/40" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/32 via-slate-950/8 to-transparent" aria-hidden />
        </>
      )}

      <div className="relative z-10 flex h-full min-h-0 flex-col justify-end px-4 py-3.5 text-left sm:px-5 sm:py-5">
        <p
          className={clsx(
            'text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em]',
            captionReadable
              ? 'text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]'
              : 'text-ink-tertiary drop-shadow-sm'
          )}
        >
          {kicker}
        </p>
        <p
          className={clsx(
            'mt-1.5 max-w-[20rem] text-[1.2rem] font-semibold leading-[1.08] tracking-tight sm:mt-2 sm:text-[1.45rem]',
            captionReadable
              ? 'text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]'
              : 'text-ink-primary drop-shadow-sm'
          )}
        >
          {title ?? 'Live call mode'}
        </p>
        <p
          className={clsx(
            'mt-1.5 max-w-[19rem] text-[12px] leading-snug line-clamp-2 sm:mt-2 sm:text-[13px] sm:leading-relaxed sm:line-clamp-none',
            captionReadable
              ? 'text-white/95 drop-shadow-[0_1px_10px_rgba(0,0,0,0.88)]'
              : 'text-ink-secondary drop-shadow-sm'
          )}
        >
          {body ??
            'Spreek in het Nederlands aan de balie. Gebruik de microfoon hieronder, of open Ondertiteling om het gesprek te lezen.'}
        </p>
      </div>
    </section>
  )
}
