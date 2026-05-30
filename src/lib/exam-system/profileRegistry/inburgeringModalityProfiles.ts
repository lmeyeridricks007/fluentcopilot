import type {
  ExamLevel,
  ExamProfile,
  ExamReadinessThresholds,
  ExamScoringBlueprint,
  ExamSectionBlueprint,
  ExamSupportedSection,
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
  return { simulation: { full: 5, section: 3 }, training: 3 }
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

function scoringListening(): ExamScoringBlueprint {
  return {
    coreWeights: {
      task_completion: 1.1,
      understandability: 1,
      grammar_control: 0.95,
      listening_accuracy: 1.15,
      natural_wording: 0.85,
      structure: 0.9,
    },
    strictnessSimulation: 1.05,
    leniencyTraining: 1.08,
    overlaysByTask: {
      listening_response_exam: {
        weights: { listening_accuracy: 1.15, task_completion: 1.05, relevance: 0.85 },
      },
      listening_mcq_exam: {
        weights: { listening_accuracy: 1.12, task_completion: 1.08, relevance: 0.95 },
      },
    },
  }
}

function scoringWriting(): ExamScoringBlueprint {
  return {
    coreWeights: {
      task_completion: 1.15,
      structure: 1.1,
      grammar_control: 1.1,
      understandability: 1,
      natural_wording: 0.95,
    },
    strictnessSimulation: 1.06,
    leniencyTraining: 1.08,
    overlaysByTask: {
      writing_task_exam: {
        weights: {
          task_completion: 1.18,
          structure: 1.08,
          grammar_control: 1.08,
          natural_wording: 1,
          politeness: 1.05,
        },
      },
    },
  }
}

/** A2 Schrijven — weights aligned with exam-style rubric (~50% adequacy / task fit). */
function inburgeringA2WritingScoring(): ExamScoringBlueprint {
  const base = scoringWriting()
  return {
    ...base,
    overlaysByTask: {
      ...base.overlaysByTask,
      writing_task_exam: {
        weights: {
          task_completion: 50,
          natural_wording: 17,
          grammar_control: 13,
          structure: 10,
          politeness: 10,
          completeness: 14,
          relevance: 14,
        },
      },
    },
  }
}

function scoringReading(): ExamScoringBlueprint {
  return {
    coreWeights: {
      task_completion: 1.1,
      understandability: 1.05,
      grammar_control: 1,
      structure: 0.95,
      clarity: 1,
    },
    strictnessSimulation: 1.05,
    leniencyTraining: 1.08,
    overlaysByTask: {
      read_aloud_exam: { weights: { pronunciation_delivery: 0.9, understandability: 1 } },
      short_response: { weights: { relevance: 1, task_completion: 1.05 } },
      knowledge_mcq: {
        weights: { task_completion: 1.12, relevance: 1.08, understandability: 1.05 },
      },
    },
  }
}

function scoringKnm(): ExamScoringBlueprint {
  return {
    coreWeights: {
      task_completion: 1.1,
      understandability: 1,
      grammar_control: 1,
      structure: 1,
      natural_wording: 0.9,
    },
    strictnessSimulation: 1.05,
    leniencyTraining: 1.1,
    overlaysByTask: {
      knowledge_mcq: { weights: { task_completion: 1.15, relevance: 1.05, listening_accuracy: 0.85 } },
      give_opinion: { weights: { stance: 1.05, reason: 1.05 } },
      justify_reason: { weights: { reason: 1.1, structure: 0.95 } },
    },
  }
}

function buildTrainingFromSim(level: ExamLevel, sim: ExamSectionBlueprint[]): ExamSectionBlueprint[] {
  const boostP = level === 'A1' ? 15 : level === 'B1' ? 12 : 10
  const boostA = level === 'A1' ? 35 : level === 'B1' ? 35 : 25
  const retries = level === 'A1' ? 4 : 3
  return sim.map((sec) => ({
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
}

export function createInburgeringListeningProfile(level: ExamLevel): ExamProfile {
  const c = levelComplexity(level)
  const g = (depth: 0 | 1 | 2) => generationFor(level, 'listening_response_exam', depth)
  const gMcq = (depth: 0 | 1 | 2) => generationFor(level, 'listening_mcq_exam', depth)
  const prep = level === 'A1' ? 35 : level === 'B1' ? 48 : 42
  const ans = level === 'A1' ? 80 : level === 'B1' ? 115 : 95

  /** Official-style A2 Luisteren: 25 MCQs over ~10 korte audiofragmenten; ca. 45 minuten totaal op het examen. */
  if (level === 'A2') {
    const prepMcq = 18
    const ansMcq = 90
    const luisterexamen: ExamSectionBlueprint = {
      id: 'luisterexamen',
      title: 'Luisteren (examen)',
      description:
        'Vijfentwintig meerkeuzevragen bij tien korte audiofragmenten — vergelijkbaar met het computerexam (ongeveer 45 minuten).',
      tasks: [
        simTask({
          taskType: 'listening_mcq_exam',
          count: 25,
          prepSeconds: prepMcq,
          answerSeconds: ansMcq,
          difficultyWeight: 1,
          scoringDimensions: ['listening_accuracy', 'task_completion', 'relevance'],
          promptKey: 'listening_mcq_exam',
          promptComplexity: c,
          taskWeighting: 1,
          generationRules: gMcq(1),
        }),
      ],
    }
    const simA2 = [luisterexamen]
    const trainA2 = buildTrainingFromSim(level, simA2)
    const supportedA2: ExamSupportedSection[] = [
      { id: 'luisterexamen', title: luisterexamen.title, description: luisterexamen.description },
    ]
    return {
      examId: `inburgering_listening_${level}`,
      examCode: 'inburgering_listening',
      level,
      version: 1,
      title: `Inburgering — Listening (${level})`,
      description:
        'Examenstijl: 25 meerkeuzevragen bij tien korte fragmenten. Op het echte examen heb je ongeveer 45 minuten; slaagnorm meestal rond 18 of 19 goed van de 25.',
      defaultLevel: level,
      supportedLevels: ['A1', 'A2', 'B1'],
      supportedModalities: ['listening'],
      tags: ['inburgering', 'integration', 'listening'],
      supportedSections: supportedA2,
      uiTextLabels: {
        catalogBadge: `Luisteren — ${level}`,
        catalogSubtitle: 'Officiële vorm: 25 meerkeuzevragen, tien fragmenten.',
        hubHeroEyebrow: 'Fluent Exam',
        hubHeroTitle: `Inburgering — Luisteren (${level})`,
        hubHeroBody:
          'Vijfentwintig meerkeuzevragen bij tien audiofragmenten. Oefen in eigen tempo; op het examen is de totale tijd ongeveer 45 minuten en moet je meestal minstens 18 à 19 vragen goed hebben.',
        simulationCta: 'Start simulatie',
        trainingCta: 'Train met begeleiding',
        timerPrepLabel: 'Voorbereiding',
        timerAnswerLabel: 'Antwoord',
        readinessReadyLabel: 'Klaar voor examenstijl',
        readinessBorderlineLabel: 'Nog oefenen',
        readinessNotReadyLabel: 'Meer training nodig',
      },
      simulationBlueprint: {
        schemaVersion: 1,
        sections: simA2,
        totalEstimateSeconds: estimateSeconds(simA2),
      },
      trainingBlueprint: {
        schemaVersion: 1,
        sections: trainA2,
        defaultSupportMode: 'full_guidance',
        repeatedPracticeAllowed: true,
        adaptiveWeaknessTargetingAllowed: true,
      },
      sections: simA2,
      scoring: scoringListening(),
      timers: {
        simulation: [
          { kind: 'prep', seconds: prepMcq, autoAdvance: true },
          { kind: 'answer', seconds: ansMcq, autoAdvance: true },
          { kind: 'section', seconds: 0, optionalInTraining: true },
          { kind: 'total_estimate', seconds: 45 * 60, optionalInTraining: true },
        ],
        trainingDefaults: [
          { kind: 'prep', seconds: 60, optionalInTraining: true, autoAdvance: false },
          { kind: 'answer', seconds: 150, optionalInTraining: true, autoAdvance: false },
        ],
      },
      ui: {
        minTasksForMeaningfulXp: { simulation: { full: 18, section: 3 }, training: 4 },
        passReadiness: readinessFor(level),
      },
      report: SHARED_REPORT,
    }
  }

  const gist: ExamSectionBlueprint = {
    id: 'gist',
    title: 'Gist',
    description: 'Korte boodschappen — wat is de hoofdboodschap?',
    tasks: [
      simTask({
        taskType: 'listening_response_exam',
        count: 2,
        prepSeconds: prep,
        answerSeconds: ans,
        difficultyWeight: 1,
        scoringDimensions: ['listening_accuracy', 'task_completion', 'understandability'],
        promptKey: 'listening_response_exam',
        promptComplexity: c,
        taskWeighting: 1.1,
        generationRules: g(0),
      }),
    ],
  }

  const detail: ExamSectionBlueprint = {
    id: 'detail',
    title: 'Detail',
    description: 'Luister naar details en kies de juiste reactie of actie.',
    tasks: [
      simTask({
        taskType: 'listening_response_exam',
        count: 2,
        prepSeconds: prep + 5,
        answerSeconds: ans + 10,
        difficultyWeight: level === 'B1' ? 1.08 : 1.02,
        scoringDimensions: ['listening_accuracy', 'relevance', 'task_completion', 'grammar_control'],
        promptKey: 'listening_response_exam',
        promptComplexity: c,
        taskWeighting: 1.15,
        generationRules: g(1),
      }),
    ],
  }

  const sim = [gist, detail]
  const train = buildTrainingFromSim(level, sim)

  const supportedSections: ExamSupportedSection[] = [
    { id: 'gist', title: 'Gist', description: gist.description },
    { id: 'detail', title: 'Detail', description: detail.description },
  ]

  return {
    examId: `inburgering_listening_${level}`,
    examCode: 'inburgering_listening',
    level,
    version: 1,
    title: `Inburgering — Listening (${level})`,
    description: 'Tekstuele luister-variant: je antwoordt zoals bij korte luisterexam-items.',
    defaultLevel: level,
    supportedLevels: ['A1', 'A2', 'B1'],
    supportedModalities: ['listening'],
    tags: ['inburgering', 'integration', 'listening'],
    supportedSections,
    uiTextLabels: {
      catalogBadge: `Luisteren — ${level}`,
      catalogSubtitle: 'Profiel-gestuurde luistertraining en simulatie.',
      hubHeroEyebrow: 'Fluent Exam',
      hubHeroTitle: `Inburgering — Listening (${level})`,
      hubHeroBody: 'Korte prompts in exam-stijl — antwoord schriftelijk in het Nederlands.',
      simulationCta: 'Start simulatie',
      trainingCta: 'Train met begeleiding',
      timerPrepLabel: 'Voorbereiding',
      timerAnswerLabel: 'Antwoord',
      readinessReadyLabel: 'Klaar voor examenstijl',
      readinessBorderlineLabel: 'Nog oefenen',
      readinessNotReadyLabel: 'Meer training nodig',
    },
    simulationBlueprint: { schemaVersion: 1, sections: sim, totalEstimateSeconds: estimateSeconds(sim) },
    trainingBlueprint: {
      schemaVersion: 1,
      sections: train,
      defaultSupportMode: 'full_guidance',
      repeatedPracticeAllowed: true,
      adaptiveWeaknessTargetingAllowed: true,
    },
    sections: sim,
    scoring: scoringListening(),
    timers: {
      simulation: [
        { kind: 'prep', seconds: 45, autoAdvance: true },
        { kind: 'answer', seconds: 120, autoAdvance: true },
        { kind: 'section', seconds: 0, optionalInTraining: true },
        { kind: 'total_estimate', seconds: 40 * 60, optionalInTraining: true },
      ],
      trainingDefaults: [
        { kind: 'prep', seconds: 60, optionalInTraining: true, autoAdvance: false },
        { kind: 'answer', seconds: 150, optionalInTraining: true, autoAdvance: false },
      ],
    },
    ui: { minTasksForMeaningfulXp: minTasksFor(level), passReadiness: readinessFor(level) },
    report: SHARED_REPORT,
  }
}

export function createInburgeringWritingProfile(level: ExamLevel): ExamProfile {
  const c = levelComplexity(level)
  const g = (depth: 0 | 1 | 2) => generationFor(level, 'writing_task_exam', depth)
  const prep = level === 'A1' ? 40 : level === 'B1' ? 55 : 48
  const ans = level === 'A1' ? 120 : level === 'B1' ? 200 : 160

  /**
   * A2 Schrijven — simulatie: vier opdrachten in ca. 40 minuten (zoals het echte examen op papier),
   * uit een grote promptbank (mail, formulier, kort bericht). Training blijft korter en met begeleiding.
   */
  if (level === 'A2') {
    const writingDims: ExamSectionBlueprint['tasks'][0]['scoringDimensions'] = [
      'task_completion',
      'natural_wording',
      'grammar_control',
      'structure',
      'politeness',
    ]
    const prepPlaceholder = 20
    const ansPlaceholder = 120
    const schrijfexamen: ExamSectionBlueprint = {
      id: 'a2_writing_examen',
      title: 'Schrijfexamen',
      description:
        'Vier schrijfopdrachten (mail, bericht, formulierfragment, formeel kort) — zoals het officiële A2 Schrijven; prompts uit een grote bank.',
      tasks: [
        simTask({
          taskType: 'writing_task_exam',
          count: 1,
          prepSeconds: prepPlaceholder,
          answerSeconds: ansPlaceholder,
          difficultyWeight: 1,
          scoringDimensions: writingDims,
          promptKey: 'writing_task_exam',
          promptComplexity: c,
          taskWeighting: 1,
          generationRules: g(0),
        }),
      ],
    }
    const simA2 = [schrijfexamen]
    const trainA2: ExamSectionBlueprint[] = [
      {
        id: 'a2_writing_training',
        title: 'Schrijven — training',
        description: 'Meerdere formats met hints en voorbeelden.',
        tasks: [
          trainTask({
            taskType: 'writing_task_exam',
            count: 6,
            prepSeconds: 50,
            answerSeconds: 200,
            difficultyWeight: 1,
            scoringDimensions: writingDims,
            promptKey: 'writing_task_exam',
            promptComplexity: c,
            taskWeighting: 1.05,
            generationRules: g(1),
          }),
        ],
      },
    ]
    const supportedA2: ExamSupportedSection[] = [
      { id: schrijfexamen.id, title: schrijfexamen.title, description: schrijfexamen.description },
      { id: trainA2[0]!.id, title: trainA2[0]!.title, description: trainA2[0]!.description },
    ]
    return {
      examId: `inburgering_writing_${level}`,
      examCode: 'inburgering_writing',
      level,
      version: 1,
      title: `Inburgering — Writing (${level})`,
      description:
        'Simulatie: vier opdrachten in ongeveer 40 minuten — aansluitend bij het echte Schrijven-examen — met prompts uit een bank van 150+ (werk, wonen, mail, app).',
      defaultLevel: level,
      supportedLevels: ['A1', 'A2', 'B1'],
      supportedModalities: ['writing'],
      tags: ['inburgering', 'integration', 'writing'],
      supportedSections: supportedA2,
      uiTextLabels: {
        catalogBadge: `Schrijven — ${level}`,
        catalogSubtitle: 'Simulatie: 4 opdrachten (examenformat) · ca. 40 min.',
        hubHeroEyebrow: 'Fluent Exam',
        hubHeroTitle: `Inburgering — Schrijven (${level})`,
        hubHeroBody:
          'Elke simulatie heeft vier opdrachten in ongeveer 40 minuten — hetzelfde aantal als op het echte A2 Schrijven (formulier, korte mail, bericht, enz.). De inhoud komt uit een grote bank van meer dan 150 voorbeelden; jij typt hier in de app in plaats van op papier.',
        simulationCta: 'Start simulatie',
        trainingCta: 'Train met begeleiding',
        timerPrepLabel: 'Voorbereiding',
        timerAnswerLabel: 'Schrijftijd',
        readinessReadyLabel: 'Klaar voor examenstijl',
        readinessBorderlineLabel: 'Nog oefenen',
        readinessNotReadyLabel: 'Meer training nodig',
      },
      simulationBlueprint: {
        schemaVersion: 1,
        sections: simA2,
        totalEstimateSeconds: 40 * 60,
      },
      trainingBlueprint: {
        schemaVersion: 1,
        sections: trainA2,
        defaultSupportMode: 'full_guidance',
        repeatedPracticeAllowed: true,
        adaptiveWeaknessTargetingAllowed: true,
      },
      sections: simA2,
      scoring: inburgeringA2WritingScoring(),
      timers: {
        simulation: [
          { kind: 'prep', seconds: prepPlaceholder, autoAdvance: true },
          { kind: 'answer', seconds: ansPlaceholder, autoAdvance: true },
          { kind: 'section', seconds: 0, optionalInTraining: true },
          { kind: 'total_estimate', seconds: 40 * 60, optionalInTraining: true },
        ],
        trainingDefaults: [
          { kind: 'prep', seconds: 70, optionalInTraining: true, autoAdvance: false },
          { kind: 'answer', seconds: 210, optionalInTraining: true, autoAdvance: false },
        ],
      },
      ui: {
        minTasksForMeaningfulXp: { simulation: { full: 4, section: 4 }, training: 3 },
        passReadiness: readinessFor(level),
      },
      report: SHARED_REPORT,
    }
  }

  const practical: ExamSectionBlueprint = {
    id: 'practical_texts',
    title: 'Practical texts',
    description: 'Sms, korte mail, formulierfragment — helder en passend.',
    tasks: [
      simTask({
        taskType: 'writing_task_exam',
        count: 2,
        prepSeconds: prep,
        answerSeconds: ans,
        difficultyWeight: 1,
        scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording'],
        promptKey: 'writing_task_exam',
        promptComplexity: c,
        taskWeighting: 1.1,
        generationRules: g(0),
      }),
    ],
  }

  const formal: ExamSectionBlueprint = {
    id: 'formal_notes',
    title: 'Formal tone',
    description: 'Iets langere schrijftaak met nette aanspreekvorm.',
    tasks: [
      simTask({
        taskType: 'writing_task_exam',
        count: 2,
        prepSeconds: prep + 8,
        answerSeconds: ans + 30,
        difficultyWeight: level === 'B1' ? 1.1 : 1.03,
        scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'politeness'],
        promptKey: 'writing_task_exam',
        promptComplexity: c,
        taskWeighting: 1.15,
        generationRules: g(1),
      }),
    ],
  }

  const sim = [practical, formal]
  const train = buildTrainingFromSim(level, sim)
  const supportedSections: ExamSupportedSection[] = [
    { id: 'practical_texts', title: 'Practical texts', description: practical.description },
    { id: 'formal_notes', title: 'Formal tone', description: formal.description },
  ]

  return {
    examId: `inburgering_writing_${level}`,
    examCode: 'inburgering_writing',
    level,
    version: 1,
    title: `Inburgering — Writing (${level})`,
    description: 'Korte schrijfopdrachten met rubric-achtige dimensies — in dezelfde exam-flow als spreken.',
    defaultLevel: level,
    supportedLevels: ['A1', 'A2', 'B1'],
    supportedModalities: ['writing'],
    tags: ['inburgering', 'integration', 'writing'],
    supportedSections,
    uiTextLabels: {
      catalogBadge: `Schrijven — ${level}`,
      catalogSubtitle: 'Profiel-gestuurde schrijftraining en simulatie.',
      hubHeroEyebrow: 'Fluent Exam',
      hubHeroTitle: `Inburgering — Writing (${level})`,
      hubHeroBody: 'Je typt je antwoord; timers en rapportage volgen het exam-system.',
      simulationCta: 'Start simulatie',
      trainingCta: 'Train met begeleiding',
      timerPrepLabel: 'Voorbereiding',
      timerAnswerLabel: 'Schrijftijd',
      readinessReadyLabel: 'Klaar voor examenstijl',
      readinessBorderlineLabel: 'Nog oefenen',
      readinessNotReadyLabel: 'Meer training nodig',
    },
    simulationBlueprint: { schemaVersion: 1, sections: sim, totalEstimateSeconds: estimateSeconds(sim) },
    trainingBlueprint: {
      schemaVersion: 1,
      sections: train,
      defaultSupportMode: 'full_guidance',
      repeatedPracticeAllowed: true,
      adaptiveWeaknessTargetingAllowed: true,
    },
    sections: sim,
    scoring: scoringWriting(),
    timers: {
      simulation: [
        { kind: 'prep', seconds: 50, autoAdvance: true },
        { kind: 'answer', seconds: 180, autoAdvance: true },
        { kind: 'section', seconds: 0, optionalInTraining: true },
        { kind: 'total_estimate', seconds: 50 * 60, optionalInTraining: true },
      ],
      trainingDefaults: [
        { kind: 'prep', seconds: 70, optionalInTraining: true, autoAdvance: false },
        { kind: 'answer', seconds: 210, optionalInTraining: true, autoAdvance: false },
      ],
    },
    ui: { minTasksForMeaningfulXp: minTasksFor(level), passReadiness: readinessFor(level) },
    report: SHARED_REPORT,
  }
}

export function createInburgeringReadingProfile(level: ExamLevel): ExamProfile {
  const c = levelComplexity(level)
  const gRead = () => generationFor(level, 'read_aloud_exam', 0)
  const gShort = (depth: 0 | 1 | 2) => generationFor(level, 'short_response', depth)

  const literal: ExamSectionBlueprint = {
    id: 'literal',
    title: 'Literal reading',
    description: 'Lees hardop en vat kort samen — woordherkenning en uitspraak.',
    tasks: [
      simTask({
        taskType: 'read_aloud_exam',
        count: 2,
        prepSeconds: level === 'A1' ? 30 : 38,
        answerSeconds: level === 'A1' ? 70 : level === 'B1' ? 100 : 85,
        difficultyWeight: 1,
        scoringDimensions: ['pronunciation_delivery', 'understandability', 'task_completion'],
        promptKey: 'read_aloud_exam',
        promptComplexity: c,
        taskWeighting: 1,
        generationRules: gRead(),
      }),
    ],
  }

  const comprehension: ExamSectionBlueprint = {
    id: 'comprehension',
    title: 'Comprehension',
    description: 'Korte vraag over betekenis of detail — zoals leesexam A2.',
    tasks: [
      simTask({
        taskType: 'short_response',
        count: 2,
        prepSeconds: level === 'A1' ? 28 : 35,
        answerSeconds: level === 'A1' ? 75 : level === 'B1' ? 105 : 90,
        difficultyWeight: 1.05,
        scoringDimensions: ['task_completion', 'understandability', 'grammar_control', 'structure'],
        promptKey: 'short_response',
        promptComplexity: c,
        taskWeighting: 1.1,
        generationRules: gShort(1),
      }),
    ],
  }

  if (level === 'A2') {
    const gMcq = (depth: 0 | 1 | 2) => generationFor(level, 'knowledge_mcq', depth)
    const prepR = 28
    const ansR = 128
    const lezen: ExamSectionBlueprint = {
      id: 'a2_reading_examen',
      title: 'Leesexamen',
      description:
        'Vijfentwintig meerkeuzevragen bij korte tot middellange teksten: korte notities, e-mail, folder, eenvoudig nieuws of webtekst — antwoorddetails staan in de tekst (geen straf voor fout).',
      tasks: [
        simTask({
          taskType: 'knowledge_mcq',
          /** Blueprint count; taskGenerator expands to 25 timed draws for every A2 reading simulation. */
          count: 25,
          prepSeconds: prepR,
          answerSeconds: ansR,
          difficultyWeight: 1,
          scoringDimensions: ['task_completion', 'relevance', 'understandability'],
          promptKey: 'knowledge_mcq',
          promptComplexity: c,
          taskWeighting: 1.15,
          generationRules: gMcq(1),
        }),
      ],
    }
    const simA2 = [lezen]
    const trainA2 = buildTrainingFromSim(level, [literal, comprehension])
    const passReadingA2 = { readyAbove: 18 / 25, borderlineAbove: 15 / 25 }
    return {
      examId: `inburgering_reading_${level}`,
      examCode: 'inburgering_reading',
      level,
      version: 1,
      title: `Inburgering — Reading (${level})`,
      description:
        'Examenstijl: 25 meerkeuzevragen (digitaal) bij korte tot middellange alledaagse teksten — e-mail of brief van school/werkgever, folders, eenvoudig nieuws of webpagina. Ongeveer 65 minuten; meestal 18–19 goed (±72–76%) voor slagen (cijfer ≥ 6 op schaal 1–10). Geen strafpunten voor fout antwoord.',
      defaultLevel: level,
      supportedLevels: ['A1', 'A2', 'B1'],
      supportedModalities: ['reading'],
      tags: ['inburgering', 'integration', 'reading'],
      supportedSections: [
        { id: lezen.id, title: lezen.title, description: lezen.description },
        { id: literal.id, title: literal.title, description: literal.description },
        { id: comprehension.id, title: comprehension.title, description: comprehension.description },
      ],
      uiTextLabels: {
        catalogBadge: `Lezen — ${level}`,
        catalogSubtitle: 'Simulatie: 25 meerkeuzevragen · ca. 65 min.',
        hubHeroEyebrow: 'Fluent Exam',
        hubHeroTitle: `Inburgering — Lezen (${level})`,
        hubHeroBody:
          'Elke simulatie: 25 unieke vragen uit een bank met korte tot middellange teksten (notitie, mail van school of werk, folder, kort nieuws, webtekst). Tip zoals op het examen: lees eerst de vraag en de keuzes — het antwoord staat meestal duidelijk in de tekst. Trainingsmodus blijft hardop lezen en korte antwoorden oefenen.',
        simulationCta: 'Start simulatie',
        trainingCta: 'Train met begeleiding',
        timerPrepLabel: 'Voorbereiding',
        timerAnswerLabel: 'Antwoord',
        readinessReadyLabel: 'Klaar voor examenstijl',
        readinessBorderlineLabel: 'Nog oefenen',
        readinessNotReadyLabel: 'Meer training nodig',
      },
      simulationBlueprint: {
        schemaVersion: 1,
        sections: simA2,
        totalEstimateSeconds: 65 * 60,
      },
      trainingBlueprint: {
        schemaVersion: 1,
        sections: trainA2,
        defaultSupportMode: 'full_guidance',
        repeatedPracticeAllowed: true,
        adaptiveWeaknessTargetingAllowed: true,
      },
      sections: simA2,
      scoring: scoringReading(),
      timers: {
        simulation: [
          { kind: 'prep', seconds: prepR, autoAdvance: true },
          { kind: 'answer', seconds: ansR, autoAdvance: true },
          { kind: 'section', seconds: 0, optionalInTraining: true },
          { kind: 'total_estimate', seconds: 65 * 60, optionalInTraining: true },
        ],
        trainingDefaults: [
          { kind: 'prep', seconds: 60, optionalInTraining: true, autoAdvance: false },
          { kind: 'answer', seconds: 150, optionalInTraining: true, autoAdvance: false },
        ],
      },
      ui: {
        minTasksForMeaningfulXp: { simulation: { full: 18, section: 1 }, training: 2 },
        passReadiness: passReadingA2,
      },
      report: SHARED_REPORT,
    }
  }

  const sim = [literal, comprehension]
  const train = buildTrainingFromSim(level, sim)
  const supportedSections: ExamSupportedSection[] = [
    { id: 'literal', title: 'Literal reading', description: literal.description },
    { id: 'comprehension', title: 'Comprehension', description: comprehension.description },
  ]

  return {
    examId: `inburgering_reading_${level}`,
    examCode: 'inburgering_reading',
    level,
    version: 1,
    title: `Inburgering — Reading (${level})`,
    description: 'Lezen in exam-flow: hardop lezen + korte begripsvragen (tekstueel in deze MVP).',
    defaultLevel: level,
    supportedLevels: ['A1', 'A2', 'B1'],
    supportedModalities: ['reading'],
    tags: ['inburgering', 'integration', 'reading'],
    supportedSections,
    uiTextLabels: {
      catalogBadge: `Lezen — ${level}`,
      catalogSubtitle: 'Profiel-gestuurde leestraining en simulatie.',
      hubHeroEyebrow: 'Fluent Exam',
      hubHeroTitle: `Inburgering — Reading (${level})`,
      hubHeroBody: 'Zelfde sessie-shell als andere examenprofielen — focus op tekst en antwoord.',
      simulationCta: 'Start simulatie',
      trainingCta: 'Train met begeleiding',
      timerPrepLabel: 'Voorbereiding',
      timerAnswerLabel: 'Antwoord',
      readinessReadyLabel: 'Klaar voor examenstijl',
      readinessBorderlineLabel: 'Nog oefenen',
      readinessNotReadyLabel: 'Meer training nodig',
    },
    simulationBlueprint: { schemaVersion: 1, sections: sim, totalEstimateSeconds: estimateSeconds(sim) },
    trainingBlueprint: {
      schemaVersion: 1,
      sections: train,
      defaultSupportMode: 'full_guidance',
      repeatedPracticeAllowed: true,
      adaptiveWeaknessTargetingAllowed: true,
    },
    sections: sim,
    scoring: scoringReading(),
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
    ui: { minTasksForMeaningfulXp: minTasksFor(level), passReadiness: readinessFor(level) },
    report: SHARED_REPORT,
  }
}

export function createInburgeringKnmProfile(level: ExamLevel): ExamProfile {
  const c = levelComplexity(level)
  const g = (task: 'describe_situation' | 'give_opinion' | 'justify_reason' | 'practical_request', depth: 0 | 1 | 2) =>
    generationFor(level, task, depth)

  const daily: ExamSectionBlueprint = {
    id: 'daily_life',
    title: 'Daily life & institutions',
    description: 'Praktische situaties en maatschappelijke context.',
    tasks: [
      simTask({
        taskType: 'describe_situation',
        count: 1,
        prepSeconds: level === 'A1' ? 32 : 40,
        answerSeconds: level === 'A1' ? 85 : level === 'B1' ? 120 : 100,
        difficultyWeight: 1,
        scoringDimensions: ['task_completion', 'clarity', 'grammar_control', 'structure'],
        promptKey: 'describe_situation',
        promptComplexity: c,
        taskWeighting: 1.05,
        generationRules: g('describe_situation', 0),
      }),
      simTask({
        taskType: 'practical_request',
        count: 1,
        prepSeconds: level === 'A1' ? 30 : 38,
        answerSeconds: level === 'A1' ? 80 : level === 'B1' ? 110 : 95,
        difficultyWeight: 1,
        scoringDimensions: ['task_completion', 'politeness', 'directness', 'natural_wording'],
        promptKey: 'practical_request',
        promptComplexity: c,
        taskWeighting: 1.05,
        generationRules: g('practical_request', 0),
      }),
    ],
  }

  const knmMcq: ExamSectionBlueprint = {
    id: 'knm_mcq',
    title: 'KNM — multiple choice',
    description: 'Kies het beste antwoord over regels, zorg en dagelijks leven in Nederland.',
    tasks: [
      simTask({
        taskType: 'knowledge_mcq',
        count: 4,
        prepSeconds: level === 'A1' ? 22 : level === 'B1' ? 32 : 28,
        answerSeconds: level === 'A1' ? 55 : level === 'B1' ? 75 : 65,
        difficultyWeight: 1,
        scoringDimensions: ['task_completion', 'relevance', 'listening_accuracy'],
        promptKey: 'knowledge_mcq',
        promptComplexity: c,
        taskWeighting: 1.2,
        generationRules: generationFor(level, 'short_response', 0),
      }),
    ],
  }

  if (level === 'A2') {
    const gMcq = (depth: 0 | 1 | 2) => generationFor(level, 'knowledge_mcq', depth)
    const prepK = 22
    const ansK = 46
    const knmExamenA2: ExamSectionBlueprint = {
      id: 'a2_knm_examen',
      title: 'KNM — examen (meerkeuze)',
      description:
        'Veertig meerkeuzevragen over o.a. wetten, instellingen en dagelijks leven — zoals op het computerexam bij DUO.',
      tasks: [
        simTask({
          taskType: 'knowledge_mcq',
          count: 1,
          prepSeconds: prepK,
          answerSeconds: ansK,
          difficultyWeight: 1,
          scoringDimensions: ['task_completion', 'relevance', 'listening_accuracy'],
          promptKey: 'knowledge_mcq',
          promptComplexity: c,
          taskWeighting: 1.2,
          generationRules: gMcq(1),
        }),
      ],
    }
    const simA2 = [knmExamenA2]
    const trainA2 = buildTrainingFromSim(level, [daily, knmMcq])
    /**
     * Readiness uses mean per-question composite (MCQ correct ≈0.93, incorrect ≈0.18 in this app’s scorer).
     * ~26/40 correct ≈ pass band often cited for KNM; ~28/40 reflects stricter norms sometimes reported from mid‑2025.
     */
    const knmMcqMean01 = (correct: number, total = 40) =>
      (correct * 0.93 + (total - correct) * 0.18) / total
    const passKnmA2 = { readyAbove: knmMcqMean01(26), borderlineAbove: knmMcqMean01(23) }
    return {
      examId: `inburgering_knm_${level}`,
      examCode: 'inburgering_knm',
      level,
      version: 1,
      title: `Inburgering — KNM (${level})`,
      description:
        'Computerexam bij DUO: 40 meerkeuzevragen in 45 minuten over o.a. cultuur, geschiedenis, geografie, onderwijs, zorg en werk. Vaak wordt ongeveer 26 goed genoemd als slaaggrens; soms wordt 28 genoemd (controleer altijd de actuele norm). Officieel: geslaagd of niet geslaagd binnen circa 8 weken via Mijn Inburgering.',
      defaultLevel: level,
      supportedLevels: ['A1', 'A2', 'B1'],
      supportedModalities: ['knm'],
      tags: ['inburgering', 'integration', 'knm', 'maatschappij'],
      supportedSections: [
        { id: daily.id, title: daily.title, description: daily.description },
        { id: knmMcq.id, title: knmMcq.title, description: knmMcq.description },
        { id: knmExamenA2.id, title: knmExamenA2.title, description: knmExamenA2.description },
      ],
      uiTextLabels: {
        catalogBadge: `KNM — ${level}`,
        catalogSubtitle: 'Simulatie: 40 meerkeuze · 45 min · ~26+ goed vaak genoemd als norm.',
        hubHeroEyebrow: 'Fluent Exam',
        hubHeroTitle: `Inburgering — KNM (${level})`,
        hubHeroBody:
          'De simulatie volgt het computerexam: 40 meerkeuzevragen in 45 minuten (Nederlandse maatschappij: wetten, zorg, werk, onderwijs, geschiedenis). Deze app geeft een practice-schatting; officieel krijg je geslaagd of niet geslaagd binnen ongeveer 8 weken in Mijn Inburgering. Trainingsmodus blijft open vragen plus meerkeuze met uitleg.',
        simulationCta: 'Start simulatie',
        trainingCta: 'Train met begeleiding',
        timerPrepLabel: 'Voorbereiding',
        timerAnswerLabel: 'Antwoord',
        readinessReadyLabel: 'Klaar voor examenstijl',
        readinessBorderlineLabel: 'Nog oefenen',
        readinessNotReadyLabel: 'Meer training nodig',
      },
      simulationBlueprint: {
        schemaVersion: 1,
        sections: simA2,
        totalEstimateSeconds: 45 * 60,
      },
      trainingBlueprint: {
        schemaVersion: 1,
        sections: trainA2,
        defaultSupportMode: 'full_guidance',
        repeatedPracticeAllowed: true,
        adaptiveWeaknessTargetingAllowed: true,
      },
      sections: simA2,
      scoring: scoringKnm(),
      timers: {
        simulation: [
          { kind: 'prep', seconds: prepK, autoAdvance: true },
          { kind: 'answer', seconds: ansK, autoAdvance: true },
          { kind: 'section', seconds: 0, optionalInTraining: true },
          { kind: 'total_estimate', seconds: 45 * 60, optionalInTraining: true },
        ],
        trainingDefaults: [
          { kind: 'prep', seconds: 60, optionalInTraining: true, autoAdvance: false },
          { kind: 'answer', seconds: 150, optionalInTraining: true, autoAdvance: false },
        ],
      },
      ui: {
        minTasksForMeaningfulXp: { simulation: { full: 26, section: 20 }, training: 2 },
        passReadiness: passKnmA2,
      },
      report: SHARED_REPORT,
    }
  }

  const sim = [daily, knmMcq]
  const train = buildTrainingFromSim(level, sim)
  const supportedSections: ExamSupportedSection[] = [
    { id: 'daily_life', title: 'Daily life & institutions', description: daily.description },
    { id: 'knm_mcq', title: 'KNM — multiple choice', description: knmMcq.description },
  ]

  return {
    examId: `inburgering_knm_${level}`,
    examCode: 'inburgering_knm',
    level,
    version: 1,
    title: `Inburgering — KNM (${level})`,
    description:
      'Kennis van de Nederlandse samenleving — open vragen plus meerkeuze in dezelfde exam-flow (timed, rapportage).',
    defaultLevel: level,
    supportedLevels: ['A1', 'A2', 'B1'],
    supportedModalities: ['knm'],
    tags: ['inburgering', 'integration', 'knm', 'maatschappij'],
    supportedSections,
    uiTextLabels: {
      catalogBadge: `KNM — ${level}`,
      catalogSubtitle: 'Profiel-gestuurde KNM-training in exam-shell.',
      hubHeroEyebrow: 'Fluent Exam',
      hubHeroTitle: `Inburgering — KNM (${level})`,
      hubHeroBody: 'Oefen maatschappelijke vragen met dezelfde simulatie- en trainingsflow als andere examens.',
      simulationCta: 'Start simulatie',
      trainingCta: 'Train met begeleiding',
      timerPrepLabel: 'Voorbereiding',
      timerAnswerLabel: 'Antwoord',
      readinessReadyLabel: 'Klaar voor examenstijl',
      readinessBorderlineLabel: 'Nog oefenen',
      readinessNotReadyLabel: 'Meer training nodig',
    },
    simulationBlueprint: { schemaVersion: 1, sections: sim, totalEstimateSeconds: estimateSeconds(sim) },
    trainingBlueprint: {
      schemaVersion: 1,
      sections: train,
      defaultSupportMode: 'full_guidance',
      repeatedPracticeAllowed: true,
      adaptiveWeaknessTargetingAllowed: true,
    },
    sections: sim,
    scoring: scoringKnm(),
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
    ui: { minTasksForMeaningfulXp: minTasksFor(level), passReadiness: readinessFor(level) },
    report: SHARED_REPORT,
  }
}

export const INBURGERING_LISTENING_A1 = createInburgeringListeningProfile('A1')
export const INBURGERING_LISTENING_A2 = createInburgeringListeningProfile('A2')
export const INBURGERING_LISTENING_B1 = createInburgeringListeningProfile('B1')

export const INBURGERING_WRITING_A1 = createInburgeringWritingProfile('A1')
export const INBURGERING_WRITING_A2 = createInburgeringWritingProfile('A2')
export const INBURGERING_WRITING_B1 = createInburgeringWritingProfile('B1')

export const INBURGERING_READING_A1 = createInburgeringReadingProfile('A1')
export const INBURGERING_READING_A2 = createInburgeringReadingProfile('A2')
export const INBURGERING_READING_B1 = createInburgeringReadingProfile('B1')

export const INBURGERING_KNM_A1 = createInburgeringKnmProfile('A1')
export const INBURGERING_KNM_A2 = createInburgeringKnmProfile('A2')
export const INBURGERING_KNM_B1 = createInburgeringKnmProfile('B1')
