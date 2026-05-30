'use client'

import { useState } from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import {
  knmSceneImageSrc,
  resolveKnmSceneEntry,
} from '@/lib/exam-prep/kmn/knmSceneImageRegistry'
import { resolveKnmSceneId } from '@/lib/exam-prep/kmn/knmSceneResolver'
import type { KnmA2ExamCategory } from '@/lib/exam-system/a2KnmExamBank'

type Props = {
  /** When set, skips resolver and uses this scene directly. */
  sceneId?: string | null
  illustrationId?: string | null
  questionImageUrl?: string | null
  questionNl?: string | null
  category?: KnmA2ExamCategory
  className?: string
}

/**
 * Photorealistic scene for a KNM question — shows the situation described in the stem.
 */
export function KnmSceneImage({
  sceneId: sceneIdProp,
  illustrationId,
  questionImageUrl,
  questionNl,
  category,
  className,
}: Props) {
  const [localFailed, setLocalFailed] = useState(false)
  const [registryFailed, setRegistryFailed] = useState(false)
  const [legacyUrlFailed, setLegacyUrlFailed] = useState(false)

  const sceneId =
    sceneIdProp?.trim() || resolveKnmSceneId(illustrationId, questionNl, category)
  const entry = resolveKnmSceneEntry(sceneId)
  const alt = entry?.altNl ?? 'Situatiefoto bij deze vraag'
  const localSrc = knmSceneImageSrc(sceneId)
  const remoteSrc = entry?.fallbackSrc

  const showLocal = !localFailed
  const showRegistry = localFailed && remoteSrc && !registryFailed
  const legacyUrl = questionImageUrl?.trim()
  const showLegacy = !showLocal && !showRegistry && legacyUrl && !legacyUrlFailed

  if (showLocal || showRegistry) {
    const src = showLocal ? localSrc : remoteSrc!
    return (
      <figure className={className}>
        <div className="relative w-full aspect-[16/9] max-h-[13rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            loading="lazy"
            unoptimized={src.startsWith('http')}
            onError={() => {
              if (showLocal) setLocalFailed(true)
              else setRegistryFailed(true)
            }}
          />
        </div>
        <figcaption className={clsx('mt-1.5 text-[10px] text-center text-slate-500 leading-snug px-1')}>
          Situatiefoto bij deze vraag
        </figcaption>
      </figure>
    )
  }

  if (showLegacy) {
    return (
      <figure className={className}>
        <div className="relative w-full aspect-[16/9] max-h-[13rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- legacy bank URL fallback only */}
          <img
            src={legacyUrl}
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setLegacyUrlFailed(true)}
          />
        </div>
        <figcaption className="mt-1.5 text-[10px] text-center text-slate-500 leading-snug px-1">
          Situatiefoto bij deze vraag
        </figcaption>
      </figure>
    )
  }

  return (
    <figure className={className}>
      <div
        className="w-full aspect-[16/9] max-h-[13rem] rounded-xl border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center px-4"
        role="img"
        aria-label={alt}
      >
        <p className="text-center text-[11px] text-slate-500 leading-snug">{alt}</p>
      </div>
    </figure>
  )
}
