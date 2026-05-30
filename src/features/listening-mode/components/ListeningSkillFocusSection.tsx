'use client'

import Link from 'next/link'
import { LISTENING_SKILL_FOCUS_ITEMS } from '@/lib/listening-mode/listeningLandingContent'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import { listeningModeSessionHref } from '@/lib/routing/appRoutes'

type Props = {
  level: ListeningLevel
}

export function ListeningSkillFocusSection({ level }: Props) {
  return (
    <section id="listening-skill-focus" className="scroll-mt-6" aria-label="Skill focus">
      <h2 className="text-caption font-bold uppercase tracking-[0.14em] text-ink-secondary">Skill focus</h2>
      <p className="mt-1 max-w-xl text-body-sm text-ink-secondary">
        Pick a thread — each opens a scenario-first burst at your level.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {LISTENING_SKILL_FOCUS_ITEMS.map((item) => (
          <li key={item.id}>
            <Link
              href={listeningModeSessionHref({ packId: item.packId, level })}
              className="flex min-h-touch flex-col rounded-xl border border-slate-200/90 bg-surface-elevated px-4 py-3 transition hover:border-primary-200/90 hover:bg-primary-50/25"
            >
              <span className="text-body-sm font-semibold text-ink-primary">{item.label}</span>
              <span className="mt-0.5 text-caption text-ink-secondary">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
