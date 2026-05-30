import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { A2_UNITS, getA2LessonRecordById, type A2StepSkillFocus } from '@/demo-data/curriculum/a2Catalog'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { enqueueReviewFromLesson, recordWeakSelfCheckTags } from '@/features/curriculum/a2ReviewStore'
import { ListenableLessonStepContent } from './ListenableLessonStepContent'
import { LessonStepIllustration, type StepIllustration } from './LessonStepIllustration'
import { InteractiveSelfCheck, type SelfCheckQuizInteraction } from './InteractiveSelfCheck'
import { WarmUpExampleReveal } from './WarmUpExampleReveal'
import { GuidedPracticePager } from './GuidedPracticePager'
import { FourSkillsPanels } from './FourSkillsPanels'
import { GuidedPracticeFourSkillsBridge } from './GuidedPracticeFourSkillsBridge'
import { parseFourSkillsBlock } from './fourSkillsStepUtils'
import { isGuidedPracticeTitle, splitGuidedPracticeItems } from './guidedPracticeUtils'
import { FreerPracticePremiumPanel, isFreerPracticeStepTitle } from './FreerPracticePremiumPanel'

const SKILL_FOCUS_BADGE: Partial<Record<A2StepSkillFocus, string>> = {
  listening: 'Listen',
  reading: 'Read',
  speaking: 'Speak',
  writing: 'Write',
  grammar: 'Grammar',
  review: 'Review',
}

type GuidedStep = {
  id: string
  title: string
  content: string
  visualAscii?: string
  illustration?: StepIllustration
  interaction?: unknown
  exampleResponse?: string
  skillFocus?: A2StepSkillFocus
}

function isSelfCheckQuiz(x: unknown): x is SelfCheckQuizInteraction {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.kind !== 'self_check_quiz') return false
  if (!Array.isArray(o.items)) return false
  return o.items.length > 0
}

export function GuidedLessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId : params.lessonId?.[0] ?? ''
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setStepIndex(0)
  }, [lessonId])

  const lesson = MOCK_LESSONS.find((l) => l.id === lessonId)
  const record = lessonId ? getA2LessonRecordById(lessonId) : undefined
  const pendingSchemaRedirect = Boolean(lessonId && lesson && !record)

  useEffect(() => {
    if (!pendingSchemaRedirect || !lessonId) return
    router.replace(peopleDailySchemaPlayerHref(lessonId))
  }, [pendingSchemaRedirect, lessonId, router])

  const steps = useMemo((): GuidedStep[] => {
    const fromJson = record?.lesson_plan.steps
    if (!fromJson?.length) return []
    return fromJson.map((s) => ({
      id: `step-${s.step}`,
      title: s.learner_title.trim(),
      content: s.activity,
      visualAscii: typeof s.visual_ascii === 'string' ? s.visual_ascii : undefined,
      illustration:
        s.illustration &&
        typeof s.illustration === 'object' &&
        typeof s.illustration.src === 'string' &&
        typeof s.illustration.alt === 'string'
          ? {
              src: s.illustration.src,
              alt: s.illustration.alt,
              width: s.illustration.width,
              height: s.illustration.height,
            }
          : undefined,
      interaction: 'interaction' in s ? s.interaction : undefined,
      exampleResponse:
        typeof s.example_response === 'string' && s.example_response.trim()
          ? s.example_response.trim()
          : undefined,
      skillFocus: s.skill_focus,
    }))
  }, [record])

  useEffect(() => {
    if (steps.length === 0) return
    setStepIndex((i) => Math.min(i, steps.length - 1))
  }, [steps.length])

  const { fourSkillsBlock, practiceSource, guidedPracticeItems } = useMemo(() => {
    if (!steps.length) {
      return { fourSkillsBlock: null, practiceSource: '', guidedPracticeItems: null as string[] | null }
    }
    const idx = Math.min(stepIndex, steps.length - 1)
    const cs = steps[idx]
    const raw = cs.content
    const block = parseFourSkillsBlock(raw)
    const src = block?.preamble ?? raw
    const guided =
      isGuidedPracticeTitle(cs.title) ? splitGuidedPracticeItems(src) : null
    return { fourSkillsBlock: block, practiceSource: src, guidedPracticeItems: guided }
  }, [steps, stepIndex])

  if (!lesson) {
    return (
      <div className="p-4">
        <p className="text-ink-secondary">Lesson not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/app/learn')}>
          Back to lessons
        </Button>
      </div>
    )
  }

  if (pendingSchemaRedirect) {
    return <LoadingScreen />
  }

  if (!record || steps.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-ink-secondary">
          No guided curriculum steps for this lesson id. Regenerate the bundle with{' '}
          <code className="text-body-sm bg-slate-100 px-1 rounded">python3 scripts/generate_a2_nl_curriculum.py</code>{' '}
          or check that the lesson id exists in the A2 catalog.
        </p>
        <Button variant="ghost" onClick={() => router.push('/app/learn')}>
          Back to lessons
        </Button>
      </div>
    )
  }

  const safeStepIndex = Math.min(stepIndex, steps.length - 1)
  const currentStep = steps[safeStepIndex]
  const progress = ((safeStepIndex + 1) / steps.length) * 100

  const isLastStep = safeStepIndex === steps.length - 1
  const visual = typeof currentStep.visualAscii === 'string' ? currentStep.visualAscii : undefined
  const illustration = currentStep.illustration
  const unitTitle = A2_UNITS.find((u) => u.id === record.unit_id)?.title
  const canDoOutcomes = record.pedagogy.can_do_outcomes
  const grammarThreadLabel = record.pedagogy.grammar_primary_label
  const skillBadge =
    currentStep?.skillFocus && currentStep.skillFocus !== 'mixed'
      ? SKILL_FOCUS_BADGE[currentStep.skillFocus]
      : undefined

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-primary-600" aria-hidden />
        </div>
        <div>
          {unitTitle ? (
            <p className="text-body-sm text-ink-tertiary mb-0.5">{unitTitle}</p>
          ) : null}
          <p className="text-caption font-medium text-primary-700 mb-1">Grammar focus: {grammarThreadLabel}</p>
          <h1 className="text-title font-bold text-ink-primary">{lesson.title}</h1>
          <p className="text-body-sm text-ink-secondary">
            {lesson.level} · Step {safeStepIndex + 1} of {steps.length}
          </p>
        </div>
      </div>
      <ProgressBar value={progress} max={100} variant="success" />

      <Card variant="outlined" className="bg-primary-50/40 border-primary-100">
        <p className="text-caption font-semibold text-primary-800 uppercase tracking-wide">After this lesson</p>
        <ul className="mt-2 list-disc pl-5 text-body-sm text-ink-secondary space-y-1">
          {canDoOutcomes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>

      <Card variant="outlined">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <CardTitle className="mb-0 flex-1 min-w-0">{currentStep.title}</CardTitle>
          {skillBadge ? (
            <span className="shrink-0 text-caption font-semibold uppercase tracking-wide text-primary-700 bg-primary-100 px-2 py-0.5 rounded-md">
              {skillBadge}
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          {guidedPracticeItems && guidedPracticeItems.length >= 2 ? (
            fourSkillsBlock ? (
              <GuidedPracticeFourSkillsBridge
                items={guidedPracticeItems}
                fourSkillsBlock={fourSkillsBlock}
                lessonId={lessonId}
                stepIndex={safeStepIndex}
              />
            ) : (
              <GuidedPracticePager
                items={guidedPracticeItems}
                stepKey={`${lessonId}-${safeStepIndex}`}
              />
            )
          ) : (
            <ListenableLessonStepContent title={currentStep.title} text={practiceSource} />
          )}
          {fourSkillsBlock && !(guidedPracticeItems && guidedPracticeItems.length >= 2) ? (
            <FourSkillsPanels
              headerMarkdown={fourSkillsBlock.headerMarkdown}
              sections={fourSkillsBlock.sections}
              footer={fourSkillsBlock.footer}
              stepKey={`${lessonId}-${safeStepIndex}`}
            />
          ) : null}
        </div>
        {currentStep.title.trim().toLowerCase() === 'warm-up' && currentStep.exampleResponse ? (
          <WarmUpExampleReveal
            example={currentStep.exampleResponse}
            stepKey={`${lessonId}-${safeStepIndex}`}
          />
        ) : null}
        {isFreerPracticeStepTitle(currentStep.title) ? (
          <FreerPracticePremiumPanel
            activityPrompt={practiceSource}
            stepKey={`${lessonId}-${safeStepIndex}`}
          />
        ) : null}
        {isSelfCheckQuiz(currentStep.interaction) ? (
          <InteractiveSelfCheck
            key={`${lessonId}-check-${safeStepIndex}`}
            interaction={currentStep.interaction}
            onGraded={({ correct, common_error_tags }) => {
              if (!correct) recordWeakSelfCheckTags(common_error_tags)
            }}
          />
        ) : null}
        {illustration ? (
          <div className="mt-5">
            <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide mb-3">
              Illustration
            </p>
            <LessonStepIllustration illustration={illustration} />
          </div>
        ) : null}
        {visual ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide mb-2">
              Picture this
            </p>
            <pre className="text-body-sm text-ink-secondary whitespace-pre-wrap font-sans leading-relaxed">
              {visual}
            </pre>
          </div>
        ) : null}
      </Card>

      <div className="flex gap-3">
        {safeStepIndex > 0 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStepIndex((i) => i - 1)}>
            Back
          </Button>
        )}
        <Button
          className={safeStepIndex > 0 ? 'flex-1' : 'w-full'}
          onClick={() => {
            if (isLastStep) {
              enqueueReviewFromLesson(lessonId)
              router.push(`/app/learn/${lessonId}/quiz`)
            } else {
              setStepIndex((i) => i + 1)
            }
          }}
        >
          {isLastStep ? 'Go to quiz' : 'Continue'}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => router.push(`/app/learn/${lessonId}/flashcards`)}>
          Flashcards
        </Button>
        <Button variant="ghost" onClick={() => router.push(`/app/learn/${lessonId}/quiz`)}>
          Quiz
        </Button>
      </div>
    </div>
  )
}
