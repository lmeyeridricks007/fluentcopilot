'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { FourSkillsPanels } from './FourSkillsPanels'
import { GuidedPracticePager } from './GuidedPracticePager'
import type { ParsedFourSkillsBlock } from './fourSkillsStepUtils'

type Props = {
  items: string[]
  fourSkillsBlock: ParsedFourSkillsBlock
  lessonId: string
  stepIndex: number
}

/**
 * Step 5 bundles numbered guided-practice tasks and a separate “all four skills” tail in one JSON step.
 * This UI splits them into two explicit parts so learners don’t see both at once.
 */
export function GuidedPracticeFourSkillsBridge({
  items,
  fourSkillsBlock,
  lessonId,
  stepIndex,
}: Props) {
  const [phase, setPhase] = useState<'tasks' | 'four-skills'>('tasks')
  const stepKey = `${lessonId}-${stepIndex}`

  useEffect(() => {
    setPhase('tasks')
  }, [stepKey])

  return (
    <div className="space-y-5">
      <p className="text-body-sm text-ink-secondary leading-relaxed">
        <span className="font-medium text-ink-primary">Two parts in this step:</span> first work through the{' '}
        {items.length} short tasks, then open the wrap-up where you practise listening, reading, writing, and
        speaking.
      </p>

      <div
        className="flex flex-col sm:flex-row gap-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200"
        role="tablist"
        aria-label="Guided practice sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={phase === 'tasks'}
          className={clsx(
            'flex-1 min-h-touch rounded-lg px-3 py-2.5 text-body-sm font-semibold transition-colors',
            phase === 'tasks'
              ? 'bg-white text-ink-primary shadow-sm ring-1 ring-slate-200/80'
              : 'text-ink-secondary hover:text-ink-primary'
          )}
          onClick={() => setPhase('tasks')}
        >
          Part 1 · Practice tasks ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={phase === 'four-skills'}
          className={clsx(
            'flex-1 min-h-touch rounded-lg px-3 py-2.5 text-body-sm font-semibold transition-colors',
            phase === 'four-skills'
              ? 'bg-white text-ink-primary shadow-sm ring-1 ring-slate-200/80'
              : 'text-ink-secondary hover:text-ink-primary'
          )}
          onClick={() => setPhase('four-skills')}
        >
          Part 2 · All four skills
        </button>
      </div>

      {phase === 'tasks' ? (
        <GuidedPracticePager
          items={items}
          stepKey={stepKey}
          fourSkillsFollow
          onOpenFourSkills={() => setPhase('four-skills')}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary">
            Optional: use the tabs above to revisit the numbered tasks. When you are ready, continue the lesson
            with the button at the bottom of the page.
          </p>
          <FourSkillsPanels
            headerMarkdown={fourSkillsBlock.headerMarkdown}
            sections={fourSkillsBlock.sections}
            footer={fourSkillsBlock.footer}
            stepKey={stepKey}
          />
        </div>
      )}
    </div>
  )
}
