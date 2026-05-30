'use client'

import { BookOpen, Ear, MessageCircle, PenLine } from 'lucide-react'
import { LessonStepContent } from './LessonStepContent'
import { FourSkillsSectionInteractive } from './FourSkillsSectionInteractive'
import type { FourSkillsKey, ParsedFourSkillsSection } from './fourSkillsStepUtils'

const LABEL: Record<FourSkillsKey, string> = {
  listening: 'Listen',
  reading: 'Read',
  writing: 'Write',
  speaking: 'Speak',
}

const ICON: Record<FourSkillsKey, typeof Ear> = {
  listening: Ear,
  reading: BookOpen,
  writing: PenLine,
  speaking: MessageCircle,
}

type Props = {
  headerMarkdown: string
  sections: ParsedFourSkillsSection[]
  footer: string
  /** e.g. `${lessonId}-${stepIndex}` — resets typed/spoken state when the step changes. */
  stepKey: string
}

function headerPlain(headerMarkdown: string): string {
  return headerMarkdown.replace(/^\*\*|\*\*$/g, '').trim()
}

export function FourSkillsPanels({ headerMarkdown, sections, footer, stepKey }: Props) {
  return (
    <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-primary-800">
          {headerPlain(headerMarkdown)}
        </p>
        <p className="mt-1 text-body-sm text-ink-tertiary">
          Short micro-tasks across modalities (not a full exam or timed test).
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((sec) => {
          const Icon = ICON[sec.skill]
          const label = LABEL[sec.skill]
          return (
            <div
              key={sec.skill}
              className="rounded-xl border border-slate-200 bg-surface-elevated/60 px-3 py-3 sm:px-4 sm:py-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-body-sm font-semibold text-ink-primary">{label}</span>
              </div>
              <FourSkillsSectionInteractive
                skill={sec.skill}
                body={sec.body}
                resetKey={`${stepKey}-${sec.skill}`}
              />
            </div>
          )
        })}
      </div>

      {footer ? (
        <div className="text-body-sm text-ink-secondary pt-1">
          <LessonStepContent text={footer} />
        </div>
      ) : null}
    </div>
  )
}
