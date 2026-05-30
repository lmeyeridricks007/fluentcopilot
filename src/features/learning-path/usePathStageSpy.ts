'use client'

import { useEffect, useRef, useState } from 'react'

type Params = {
  /** Unlocked stage band ids in path order (excludes locked tail previews). */
  bandIds: readonly string[]
  sectionRefs: React.MutableRefObject<Map<string, HTMLElement>>
  /** Prefer this band until scroll says otherwise (e.g. hero “current” stage). */
  preferredBandId: string
}

/**
 * Scroll-driven “which stage am I in?” for long paths. Pair with a sticky bar
 * whose bottom edge is used as the activation line.
 */
export function usePathStageSpy({ bandIds, sectionRefs, preferredBandId }: Params) {
  const stickyBarRef = useRef<HTMLDivElement | null>(null)

  const [activeBandId, setActiveBandId] = useState(() => {
    if (bandIds.length === 0) return preferredBandId
    if (bandIds.includes(preferredBandId)) return preferredBandId
    return bandIds[0]!
  })

  const bandKey = bandIds.join('|')

  useEffect(() => {
    if (bandIds.length === 0) return
    setActiveBandId((prev) => (bandIds.includes(prev) ? prev : bandIds[0]!))
  }, [bandKey, bandIds])

  useEffect(() => {
    if (bandIds.length === 0) return

    const measureLine = () => {
      const el = stickyBarRef.current
      if (el) return el.getBoundingClientRect().bottom + 8
      return 120
    }

    const tick = () => {
      const line = measureLine()
      let current = bandIds[0]!
      for (const id of bandIds) {
        const node = sectionRefs.current.get(id)
        if (!node) continue
        if (node.getBoundingClientRect().top <= line) current = id
      }
      setActiveBandId((p) => (p === current ? p : current))
    }

    tick()
    window.addEventListener('scroll', tick, { passive: true })
    window.addEventListener('resize', tick)
    return () => {
      window.removeEventListener('scroll', tick)
      window.removeEventListener('resize', tick)
    }
  }, [bandKey, bandIds, sectionRefs])

  return { activeBandId, stickyBarRef }
}
