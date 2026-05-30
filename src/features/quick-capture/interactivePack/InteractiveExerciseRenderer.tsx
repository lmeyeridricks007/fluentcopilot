'use client'

import type { ExerciseBlockResultPayload } from '@/features/generated-exercise-pack/exerciseBlockResult'
import {
  BuildASentenceBlock,
  ExplanationCardBlock,
  FillInBlankBlock,
  HearAndRepeatBlock,
  ListeningBurstBlock,
  MultipleChoiceBlock,
  ReadAloudRepBlock,
  RecordAndCompareBlock,
  ReflectionCheckBlock,
  ReorderSentenceBlock,
  SaveToLibraryBlock,
  SayItAloudBlock,
  ScenarioJumpoffBlock,
  WriteYourOwnLineBlock,
} from '@/features/generated-exercise-pack/blocks'
import type { InteractiveExercise } from './types'

export function InteractiveExerciseRenderer(props: {
  exercise: InteractiveExercise
  onComplete: (result?: ExerciseBlockResultPayload) => void
  disabled?: boolean
  compact?: boolean
}) {
  const { exercise: ex, onComplete, disabled, compact } = props

  const done = (result?: ExerciseBlockResultPayload) => {
    if (disabled) return
    onComplete(result)
  }

  switch (ex.kind) {
    case 'explanation_card':
      return (
        <ExplanationCardBlock
          blockId={ex.id}
          eyebrow={ex.eyebrow}
          title={ex.title}
          paragraphs={ex.paragraphs}
          bullets={ex.bullets}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'multiple_choice_meaning':
    case 'multiple_choice_usage':
    case 'choose_best_phrase':
    case 'mini_dialogue_choice':
      return (
        <MultipleChoiceBlock
          blockId={ex.id}
          question={ex.questionEn}
          options={ex.options}
          correctOptionId={ex.correctOptionId}
          correctExplanation={ex.correctExplanationEn}
          incorrectFeedbackStyle={ex.incorrectFeedbackStyle}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'hear_and_repeat':
    case 'pronunciation_rep':
      return (
        <HearAndRepeatBlock
          blockId={ex.id}
          textNl={ex.textNl}
          helperEn={ex.helperEn}
          exampleLinesNl={ex.exampleLinesNl}
          referenceAudioUrl={ex.referenceAudioUrl}
          voice={ex.voice}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'fill_in_blank':
      return (
        <FillInBlankBlock
          blockId={ex.id}
          promptEn={ex.promptEn}
          sentenceNl={ex.sentenceNl}
          acceptableAnswers={ex.acceptableAnswers}
          caseInsensitive={ex.caseInsensitive !== false}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'reorder_sentence':
      return (
        <ReorderSentenceBlock
          blockId={ex.id}
          tokens={ex.tokens}
          correctSentenceNl={ex.correctSentenceNl}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'build_a_sentence':
      return (
        <BuildASentenceBlock
          blockId={ex.id}
          tokens={ex.tokens}
          correctSentenceNl={ex.correctSentenceNl}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'say_it_aloud':
      return (
        <SayItAloudBlock
          blockId={ex.id}
          instructionEn={ex.instructionEn}
          targetNl={ex.targetNl}
          exampleLinesNl={ex.exampleLinesNl}
          referenceAudioUrl={ex.referenceAudioUrl}
          voice={ex.voice}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'write_your_own_line':
      return (
        <WriteYourOwnLineBlock
          blockId={ex.id}
          promptEn={ex.promptEn}
          promptNl={ex.promptNl}
          minChars={ex.minChars ?? 6}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'listening_burst':
      return (
        <ListeningBurstBlock
          blockId={ex.id}
          textNl={ex.textNl}
          playsRecommended={ex.playsRecommended ?? 2}
          questionEn={ex.questionEn}
          options={ex.options}
          correctOptionId={ex.correctOptionId}
          correctExplanationEn={ex.correctExplanationEn}
          referenceAudioUrl={ex.referenceAudioUrl}
          voice={ex.voice}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'read_aloud_rep':
      return (
        <ReadAloudRepBlock
          blockId={ex.id}
          textNl={ex.textNl}
          readAloudHref={ex.readAloudHref}
          afterReadPromptEn={ex.afterReadPromptEn}
          referenceAudioUrl={ex.referenceAudioUrl}
          voice={ex.voice}
          optionalDeepLinks={ex.optionalDeepLinks}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'scenario_jumpoff':
      return (
        <ScenarioJumpoffBlock
          blockId={ex.id}
          title={ex.title}
          descriptionEn={ex.descriptionEn}
          href={ex.href}
          confirmLabel={ex.confirmLabel}
          linkLabel={ex.linkLabel}
          optionalDeepLinks={ex.optionalDeepLinks}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'save_to_library_action':
      return (
        <SaveToLibraryBlock blockId={ex.id} bodyEn={ex.bodyEn} compact={compact} disabled={disabled} onComplete={done} />
      )

    case 'record_and_compare':
      return (
        <RecordAndCompareBlock
          blockId={ex.id}
          instructionEn={ex.instructionEn}
          targetNl={ex.targetNl}
          referenceAudioUrl={ex.referenceAudioUrl}
          voice={ex.voice}
          maxRecordingSeconds={ex.maxRecordingSeconds}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    case 'reflection_check':
      return (
        <ReflectionCheckBlock
          blockId={ex.id}
          promptEn={ex.promptEn}
          yesLabel={ex.yesLabel}
          notYetLabel={ex.notYetLabel}
          compact={compact}
          disabled={disabled}
          onComplete={done}
        />
      )

    default: {
      const _exhaustive: never = ex
      void _exhaustive
      return <p className="text-caption text-red-600">Unsupported exercise type.</p>
    }
  }
}
