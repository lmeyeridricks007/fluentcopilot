import type {
  ExamLevel,
  ExamProfile,
  ExamReadinessThresholds,
  ExamScoringBlueprint,
  ExamSectionBlueprint,
  ExamSupportedSection,
  ExamTaskType,
} from '../types'
import { generationFor, levelComplexity, simTask, trainTask } from './blueprintBuilders'

const SHARED_REPORT: ExamProfile['report'] = {
  simulation: {
    showReadinessEstimate: true,
    showDimensionBreakdown: true,
    showTaskTypeSummary: true,
    showNextTraining: true,
  },
  training: {
    showImprovements: true,
    showBlockers: true,
    showRetrySuggestions: true,
    showReadinessDelta: true,
  },
}

function scoringFor(level: ExamLevel): ExamScoringBlueprint {
  const base: ExamScoringBlueprint = {
    coreWeights: {
      task_completion: 1.15,
      understandability: 1,
      grammar_control: 1,
      natural_wording: 0.95,
      pronunciation_delivery: 0.85,
      structure: 1,
    },
    strictnessSimulation: level === 'B1' ? 1.08 : level === 'A1' ? 1.0 : 1.05,
    leniencyTraining: level === 'A1' ? 1.12 : level === 'B1' ? 1.04 : 1.08,
    overlaysByTask: {
      practical_request: { weights: { directness: 0.9, politeness: 1, completion: 0.85 } },
      give_opinion: { weights: { stance: 1.05, reason: 1.05, structure: 0.6 } },
      follow_up_response: { weights: { responsiveness: 1.1, continuation: 0.95, relevance: 1 } },
      storytelling: { weights: { sequence: 0.9, clarity: 0.85, tense_flow: 0.75 } },
      explain_process: { weights: { sequence: 1, completeness: 0.95, clarity: 0.9 } },
      compare_options: { weights: { structure: 0.7, clarity: 0.8, stance: 0.5 } },
      listening_mcq_exam: { weights: { listening_accuracy: 1.12, task_completion: 1.08, relevance: 0.95 } },
    },
  }
  return base
}

function readinessFor(level: ExamLevel): ExamReadinessThresholds {
  if (level === 'A1') return { readyAbove: 0.68, borderlineAbove: 0.52 }
  if (level === 'B1') return { readyAbove: 0.76, borderlineAbove: 0.62 }
  return { readyAbove: 0.72, borderlineAbove: 0.58 }
}

function minTasksFor(level: ExamLevel): ExamProfile['ui']['minTasksForMeaningfulXp'] {
  if (level === 'A1') {
    return { simulation: { full: 4, section: 2 }, training: 2 }
  }
  if (level === 'B1') {
    return { simulation: { full: 6, section: 3 }, training: 4 }
  }
  /** A2 full exam = 12 spoken + 12 listening MCQ — require most items for XP. */
  return { simulation: { full: 20, section: 8 }, training: 3 }
}

function supportedSectionsMeta(level: ExamLevel): ExamSupportedSection[] {
  if (level === 'A2') {
    return [
      {
        id: 'a2_speaking_part1',
        title: 'Deel 1 — Spreekreacties',
        description: 'Twaalf opdrachten: scenario (audio) en daarna uw gesproken antwoord — vergelijkbaar met korte video’s op het examen.',
      },
      {
        id: 'a2_speaking_part2',
        title: 'Deel 2 — Luisteren (meerkeuze)',
        description: 'Twaalf dialogen beluisteren en het beste antwoord kiezen.',
      },
    ]
  }
  const discourseDesc =
    level === 'A1'
      ? 'Korte mening en eenvoudige reden — weinig impliciete context.'
      : level === 'B1'
        ? 'Mening, onderbouwing, vergelijking en abstractere situaties.'
        : 'Opinions, reasons, and comparison.'
  return [
    {
      id: 'oral_basics',
      title: 'Oral basics',
      description:
        level === 'A1'
          ? 'Concrete verzoeken en korte antwoorden.'
          : level === 'B1'
            ? 'Praktische scenario’s met hogere precisie- en woordendruk.'
            : 'Requests and short answers under everyday pressure.',
    },
    {
      id: 'interaction',
      title: 'Interaction',
      description:
        level === 'A1'
          ? 'Eenvoudige roleplay en één vervolgvraag.'
          : level === 'B1'
            ? 'Roleplay met meerdere vervolgvragen en meer sociale druk.'
            : 'Role-play and follow-up continuity.',
    },
    { id: 'discourse', title: 'Discourse', description: discourseDesc },
  ]
}

function uiTextLabelsFor(level: ExamLevel): Record<string, string> {
  const band =
    level === 'A1'
      ? 'A1 — basisniveau'
      : level === 'B1'
        ? 'B1 — gevorderd'
        : 'A2 — tweedelige examenopbouw (12 + 12)'
  return {
    catalogBadge: band,
    catalogSubtitle:
      level === 'A2'
        ? 'Spreken A2 — zoals het examen: deel 1 spreekreacties, deel 2 luister-meerkeuze.'
        : 'Spreken — profiel-gestuurde simulatie en training.',
    hubHeroEyebrow: 'Fluent Exam',
    hubHeroTitle: `Inburgering — Speaking (${level})`,
    hubHeroBody:
      level === 'A1'
        ? 'Korte, duidelijke opdrachten met weinig impliciete context.'
        : level === 'B1'
          ? 'Meer abstracte prompts, sterkere argumentatie en vervolgspanning.'
          : 'Tweedelige flow: twaalf gesproken reacties op scenario’s, daarna twaalf luister-meerkeuze.',
    simulationCta: 'Start simulatie',
    trainingCta: 'Train met begeleiding',
    timerPrepLabel: 'Voorbereiding',
    timerAnswerLabel: 'Antwoord',
    readinessReadyLabel: 'Klaar voor examenstijl',
    readinessBorderlineLabel: 'Nog oefenen',
    readinessNotReadyLabel: 'Meer training nodig',
  }
}

function estimateSeconds(sections: ExamSectionBlueprint[]): number {
  let s = 0
  for (const sec of sections) {
    for (const t of sec.tasks) {
      s += (t.prepSeconds + t.answerSeconds) * t.count
    }
  }
  return s
}

function simulationSections(level: ExamLevel): ExamSectionBlueprint[] {
  const c = levelComplexity(level)
  const g = (taskType: ExamTaskType, depth: 0 | 1 | 2) => generationFor(level, taskType, depth)

  /** Official-style A2 speaking: Part 1 = 12 spoken, Part 2 = 12 listening MCQ. */
  if (level === 'A2') {
    const part1: ExamSectionBlueprint = {
      id: 'a2_speaking_part1',
      title: 'Deel 1 — Spreekreacties',
      description:
        'Twaalf korte situaties. Op het echte examen ziet u korte video’s; hier hoort u een geluidsfragment als oefening, daarna spreekt u uw antwoord in.',
      tasks: [
        simTask({
          taskType: 'short_response',
          count: 6,
          prepSeconds: 30,
          answerSeconds: 75,
          difficultyWeight: 1,
          scoringDimensions: [
            'task_completion',
            'understandability',
            'grammar_control',
            'structure',
            'pronunciation_delivery',
          ],
          promptKey: 'short_response',
          promptComplexity: c,
          taskWeighting: 1,
          generationRules: g('short_response', 1),
        }),
        simTask({
          taskType: 'practical_request',
          count: 3,
          prepSeconds: 35,
          answerSeconds: 90,
          difficultyWeight: 1,
          scoringDimensions: [
            'task_completion',
            'directness',
            'politeness',
            'natural_wording',
            'grammar_control',
            'pronunciation_delivery',
          ],
          promptKey: 'practical_request',
          promptComplexity: c,
          taskWeighting: 1.1,
          generationRules: g('practical_request', 1),
        }),
        simTask({
          taskType: 'follow_up_response',
          count: 3,
          prepSeconds: 28,
          answerSeconds: 85,
          difficultyWeight: 1.05,
          scoringDimensions: [
            'responsiveness',
            'continuation',
            'relevance',
            'structure',
            'pronunciation_delivery',
          ],
          promptKey: 'follow_up_response',
          promptComplexity: c,
          taskWeighting: 1.05,
          generationRules: g('follow_up_response', 2),
        }),
      ],
    }
    const part2: ExamSectionBlueprint = {
      id: 'a2_speaking_part2',
      title: 'Deel 2 — Luisteren (meerkeuze)',
      description: 'Twaalf dialogen: luister goed en kies het beste antwoord op de vraag.',
      tasks: [
        simTask({
          taskType: 'listening_mcq_exam',
          count: 12,
          prepSeconds: 22,
          answerSeconds: 52,
          difficultyWeight: 1,
          scoringDimensions: ['listening_accuracy', 'task_completion', 'relevance'],
          promptKey: 'listening_mcq_exam',
          promptComplexity: c,
          taskWeighting: 1,
          generationRules: g('listening_mcq_exam', 1),
        }),
      ],
    }
    return [part1, part2]
  }

  const practicalRequestCount = level === 'B1' ? 3 : 2
  const shortResponseCount = 1

  const oralBasics: ExamSectionBlueprint = {
    id: 'oral_basics',
    title: 'Oral basics',
    description:
      level === 'A1'
        ? 'Korte, concrete verzoeken en antwoorden.'
        : 'Praktische scenario’s met hogere precisie.',
    tasks: [
      simTask({
        taskType: 'practical_request',
        count: practicalRequestCount,
        prepSeconds: level === 'A1' ? 30 : 40,
        answerSeconds: level === 'A1' ? 75 : 105,
        difficultyWeight: level === 'A1' ? 0.95 : 1.08,
        scoringDimensions: [
          'task_completion',
          'directness',
          'politeness',
          'natural_wording',
          'grammar_control',
        ],
        promptKey: 'practical_request',
        promptComplexity: c,
        taskWeighting: 1.15,
        generationRules: g('practical_request', 0),
      }),
      simTask({
        taskType: 'short_response',
        count: shortResponseCount,
        prepSeconds: level === 'A1' ? 22 : 25,
        answerSeconds: level === 'A1' ? 60 : 85,
        difficultyWeight: 1,
        scoringDimensions: ['task_completion', 'understandability', 'grammar_control', 'structure'],
        promptKey: 'short_response',
        promptComplexity: c,
        taskWeighting: 1,
        generationRules: g('short_response', 0),
      }),
    ],
  }

  const followUpCount = level === 'A1' ? 1 : 3
  const interaction: ExamSectionBlueprint = {
    id: 'interaction',
    title: 'Interaction',
    description:
      level === 'A1'
        ? 'Eenvoudige roleplay en korte vervolgstap.'
        : 'Roleplay met meerdere vervolgvragen en redenering.',
    tasks: [
      simTask({
        taskType: 'roleplay',
        count: 1,
        prepSeconds: level === 'A1' ? 35 : 45,
        answerSeconds: level === 'A1' ? 95 : 130,
        difficultyWeight: level === 'B1' ? 1.12 : 1.05,
        scoringDimensions: ['task_completion', 'responsiveness', 'natural_wording', 'politeness'],
        promptKey: 'roleplay',
        promptComplexity: c,
        taskWeighting: 1.1,
        generationRules: g('roleplay', level === 'A1' ? 1 : 2),
      }),
      simTask({
        taskType: 'follow_up_response',
        count: followUpCount,
        prepSeconds: level === 'B1' ? 32 : 30,
        answerSeconds: level === 'A1' ? 80 : 110,
        difficultyWeight: level === 'B1' ? 1.12 : 1.05,
        scoringDimensions: ['responsiveness', 'continuation', 'relevance', 'structure'],
        promptKey: 'follow_up_response',
        promptComplexity: c,
        taskWeighting: level === 'B1' ? 1.2 : 1.05,
        generationRules: g('follow_up_response', level === 'A1' ? 1 : 2),
      }),
    ],
  }

  if (level === 'A1') {
    const discourse: ExamSectionBlueprint = {
      id: 'discourse',
      title: 'Discourse',
      description: 'Eén korte mening — minimale abstractie.',
      tasks: [
        simTask({
          taskType: 'give_opinion',
          count: 1,
          prepSeconds: 32,
          answerSeconds: 85,
          difficultyWeight: 1,
          scoringDimensions: ['stance', 'reason', 'structure', 'natural_wording', 'grammar_control'],
          promptKey: 'give_opinion',
          promptComplexity: 'low',
          taskWeighting: 1,
          generationRules: g('give_opinion', 0),
        }),
      ],
    }
    return [oralBasics, interaction, discourse]
  }

  const discourseTasks: ExamSectionBlueprint['tasks'] = [
    simTask({
      taskType: 'give_opinion',
      count: 1,
      prepSeconds: 40,
      answerSeconds: level === 'B1' ? 125 : 110,
      difficultyWeight: level === 'B1' ? 1.12 : 1.08,
      scoringDimensions: ['stance', 'reason', 'structure', 'natural_wording', 'grammar_control'],
      promptKey: 'give_opinion',
      promptComplexity: c,
      taskWeighting: 1.05,
      generationRules: g('give_opinion', level === 'B1' ? 2 : 1),
    }),
    simTask({
      taskType: 'justify_reason',
      count: 1,
      prepSeconds: 35,
      answerSeconds: level === 'B1' ? 130 : 115,
      difficultyWeight: level === 'B1' ? 1.12 : 1.08,
      scoringDimensions: ['reason', 'structure', 'grammar_control', 'task_completion'],
      promptKey: 'justify_reason',
      promptComplexity: c,
      taskWeighting: 1.05,
      generationRules: g('justify_reason', level === 'B1' ? 2 : 1),
    }),
    simTask({
      taskType: 'describe_situation',
      count: 1,
      prepSeconds: 35,
      answerSeconds: level === 'B1' ? 120 : 105,
      difficultyWeight: 1,
      scoringDimensions: ['clarity', 'structure', 'task_completion', 'understandability'],
      promptKey: 'describe_situation',
      promptComplexity: c,
      taskWeighting: 1,
      generationRules: g('describe_situation', level === 'B1' ? 2 : 1),
    }),
  ]

  if (level === 'B1') {
    discourseTasks.push(
      simTask({
        taskType: 'compare_options',
        count: 1,
        prepSeconds: 40,
        answerSeconds: 125,
        difficultyWeight: 1.1,
        scoringDimensions: ['structure', 'clarity', 'stance', 'grammar_control', 'task_completion'],
        promptKey: 'compare_options',
        promptComplexity: 'high',
        taskWeighting: 1.15,
        generationRules: g('compare_options', 2),
      }),
    )
  }

  const discourse: ExamSectionBlueprint = {
    id: 'discourse',
    title: 'Discourse',
    description: level === 'B1' ? 'Mening, onderbouwing, beschrijving en vergelijking.' : 'Opinions, reasons, and comparison.',
    tasks: discourseTasks,
  }

  return [oralBasics, interaction, discourse]
}

function buildTrainingSections(level: ExamLevel, sim: ExamSectionBlueprint[]): ExamSectionBlueprint[] {
  const boostP = level === 'A1' ? 15 : level === 'B1' ? 12 : 10
  const boostA = level === 'A1' ? 35 : level === 'B1' ? 35 : 25
  const retries = level === 'A1' ? 4 : 3

  const mapped = sim.map((sec) => ({
    ...sec,
    tasks: sec.tasks.map((t) =>
      trainTask({
        taskType: t.taskType,
        count: t.count,
        prepSeconds: t.prepSeconds + boostP,
        answerSeconds: t.answerSeconds + boostA,
        difficultyWeight: t.difficultyWeight,
        scoringDimensions: t.scoringDimensions,
        promptKey: t.promptKey,
        promptComplexity: t.promptComplexity,
        taskWeighting: t.taskWeighting,
        generationRules: t.generationRules,
        training: { maxRetriesPerTask: retries },
      }),
    ),
  }))

  if (level === 'A1') {
    const oral = mapped.find((s) => s.id === 'oral_basics')
    if (oral) {
      oral.tasks.push(
        trainTask({
          taskType: 'sequencing',
          count: 1,
          prepSeconds: 28,
          answerSeconds: 75,
          difficultyWeight: 0.9,
          scoringDimensions: ['sequence', 'clarity', 'grammar_control'],
          promptKey: 'sequencing',
          promptComplexity: 'low',
          taskWeighting: 0.85,
          generationRules: generationFor(level, 'sequencing', 0),
          training: { maxRetriesPerTask: retries },
        }),
      )
    }
  }

  if (level === 'B1') {
    const oral = mapped.find((s) => s.id === 'oral_basics')
    if (oral) {
      oral.tasks.push(
        trainTask({
          taskType: 'explain_process',
          count: 1,
          prepSeconds: 42,
          answerSeconds: 130,
          difficultyWeight: 1.05,
          scoringDimensions: ['sequence', 'completeness', 'clarity', 'grammar_control'],
          promptKey: 'explain_process',
          promptComplexity: 'high',
          taskWeighting: 1.05,
          generationRules: generationFor(level, 'explain_process', 2),
          training: { maxRetriesPerTask: retries },
        }),
      )
    }
  }

  return mapped
}

export function createInburgeringSpeakingProfile(level: ExamLevel): ExamProfile {
  const sim = simulationSections(level)
  const train = buildTrainingSections(level, sim)

  return {
    examId: `inburgering_speaking_${level}`,
    examCode: 'inburgering_speaking',
    level,
    version: 1,
    title: `Inburgering — Speaking (${level})`,
    description:
      level === 'A1'
        ? 'A1-profiel: eenvoudige praktische prompts, kortere antwoorden, beperkte impliciete context.'
        : level === 'B1'
          ? 'B1-profiel: abstractere opdrachten, meer vervolgspanning en rijkere woordenschat-verwachting.'
          : 'A2-profiel: examenopbouw met twaalf spreekreacties en twaalf luister-meerkeuzevragen.',
    defaultLevel: level,
    supportedLevels: ['A1', 'A2', 'B1'],
    supportedModalities: ['speaking'],
    tags: ['inburgering', 'integration', 'oral'],
    supportedSections: supportedSectionsMeta(level),
    uiTextLabels: uiTextLabelsFor(level),
    simulationBlueprint: {
      schemaVersion: 1,
      sections: sim,
      totalEstimateSeconds: estimateSeconds(sim),
    },
    trainingBlueprint: {
      schemaVersion: 1,
      sections: train,
      defaultSupportMode: 'full_guidance',
      repeatedPracticeAllowed: true,
      adaptiveWeaknessTargetingAllowed: true,
    },
    sections: sim,
    scoring: scoringFor(level),
    timers: {
      simulation: [
        { kind: 'prep', seconds: 45, autoAdvance: true },
        { kind: 'answer', seconds: 120, autoAdvance: true },
        { kind: 'section', seconds: 0, optionalInTraining: true },
        { kind: 'total_estimate', seconds: 45 * 60, optionalInTraining: true },
      ],
      trainingDefaults: [
        { kind: 'prep', seconds: 60, optionalInTraining: true, autoAdvance: false },
        { kind: 'answer', seconds: 150, optionalInTraining: true, autoAdvance: false },
      ],
    },
    ui: {
      minTasksForMeaningfulXp: minTasksFor(level),
      passReadiness: readinessFor(level),
    },
    report: SHARED_REPORT,
  }
}

export const INBURGERING_SPEAKING_A1 = createInburgeringSpeakingProfile('A1')
export const INBURGERING_SPEAKING_A2 = createInburgeringSpeakingProfile('A2')
export const INBURGERING_SPEAKING_B1 = createInburgeringSpeakingProfile('B1')
