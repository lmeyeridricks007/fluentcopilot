'use client'

import { clsx } from 'clsx'

const BAR_COUNT = 14

export function SpeakLiveWaveform({
  active,
  variant,
}: {
  active: boolean
  variant: 'user' | 'ai'
}) {
  const base = variant === 'user' ? 'from-emerald-400/90 to-emerald-600/80' : 'from-violet-400/90 to-fuchsia-500/80'

  return (
    <div
      className={clsx(
        'flex h-14 items-end justify-center gap-[3px] px-2 transition-opacity duration-300',
        active ? 'opacity-100' : 'opacity-25'
      )}
      aria-hidden
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className={clsx(
            'w-[3px] h-9 origin-bottom rounded-full bg-gradient-to-t',
            base,
            active ? 'motion-safe:animate-fc-speak-bar' : 'scale-y-[0.2]'
          )}
          style={
            active
              ? ({
                  animationDelay: `${i * 55}ms`,
                  animationDuration: `${380 + (i % 6) * 35}ms`,
                } as React.CSSProperties)
              : undefined
          }
        />
      ))}
    </div>
  )
}
