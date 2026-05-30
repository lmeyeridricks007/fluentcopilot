import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { SkillTrackVm } from '../types'

export function SkillTrackCard({ track }: { track: SkillTrackVm }) {
  return (
    <Link href={track.href} className="block min-h-touch">
      <Card
        variant="outlined"
        padding="sm"
        className="border-slate-200/90 hover:border-primary-100 hover:bg-primary-50/15 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl w-10 text-center shrink-0" aria-hidden>
            {track.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-semibold text-ink-primary">{track.title}</p>
            <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{track.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {track.premium ? (
                <span className="text-caption font-medium text-amber-800 bg-amber-50 px-1.5 rounded">Premium</span>
              ) : (
                <span className="text-caption text-ink-tertiary">Included</span>
              )}
              <span className="text-caption font-semibold text-primary-700">Open track</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
        </div>
      </Card>
    </Link>
  )
}
