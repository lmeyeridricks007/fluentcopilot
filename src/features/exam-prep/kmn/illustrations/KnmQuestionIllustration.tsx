'use client'

import type { KnmIllustrationId } from '@/lib/exam-prep/kmn/knmIllustrationRegistry'
import { isKnmIllustrationId } from '@/lib/exam-prep/kmn/knmIllustrationRegistry'
import { KNM_ILLUSTRATION_SCENES } from '@/features/exam-prep/kmn/illustrations/knmIllustrationScenes'
import { KnmSlideDeckIllustrationScene } from '@/features/exam-prep/kmn/illustrations/KnmSlideDeckIllustrationScene'
import { isKnmSlideDeckIllustrationId } from '@/lib/exam-prep/kmn/knmSlideDeckIllustrationCatalog'

export function KnmQuestionIllustration(props: {
  illustrationId: string
  className?: string
  caption?: string
}) {
  const { illustrationId, className, caption } = props
  if (!isKnmIllustrationId(illustrationId)) return null

  if (isKnmSlideDeckIllustrationId(illustrationId)) {
    return (
      <figure className={className}>
        <div className="rounded-xl overflow-hidden border border-indigo-200/80 bg-gradient-to-b from-indigo-50/90 to-white shadow-sm ring-1 ring-indigo-100/60">
          <KnmSlideDeckIllustrationScene illustrationId={illustrationId} />
        </div>
        {caption ? (
          <figcaption className="mt-1.5 text-[10px] text-center text-slate-500 leading-snug px-1">{caption}</figcaption>
        ) : null}
      </figure>
    )
  }

  const Scene = KNM_ILLUSTRATION_SCENES[illustrationId as KnmIllustrationId]
  if (!Scene) return null
  return (
    <figure className={className}>
      <div className="rounded-xl overflow-hidden border border-indigo-200/80 bg-gradient-to-b from-indigo-50/90 to-white shadow-sm ring-1 ring-indigo-100/60">
        <Scene />
      </div>
      {caption ? (
        <figcaption className="mt-1.5 text-[10px] text-center text-slate-500 leading-snug px-1">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
