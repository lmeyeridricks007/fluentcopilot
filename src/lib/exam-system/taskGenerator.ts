import type {
  ExamLevel,
  ExamProfile,
  ExamRunMode,
  ExamScope,
  ExamTaskBlueprint,
  ExamTaskInstance,
  ExamTaskType,
} from './types'
import { EXAM_PROMPT_VARIANT_BANKS } from './examPromptVariants'
import { buildA2StandaloneListeningExamSequence } from './a2StandaloneListeningExamPack'
import { A2_READING_EXAM_MCQ_POOL, getA2ReadingExamMcqByPoolIndex } from './a2ReadingExamMcqBank'
import { A2_WRITING_EXAM_QUESTION_BANK, getA2WritingExamBankItem } from './a2WritingExamQuestionBank'
import { pickA2WritingSimulationTaskCount } from './a2WritingExamSessionDraw'
import { pickA2WritingStratifiedBankIndices } from './a2WritingExamStratifiedDraw'
import { sampleUniqueIndices } from './a2SpeakingExamSessionSample'
import { A2_PART1_QUESTION_BANK, a2Part1BlueprintForTaskType } from './a2SpeakingPart1QuestionBank'
import { getA2KnmMcqByPoolIndex, pickKnmMcq, sampleA2KnmExamPoolIndices } from './knmMcqBank'
import {
  A2_SPEAKING_LISTENING_MCQ_POOL,
  getA2SpeakingListeningMcqByPoolIndex,
  pickSpeakingListeningMcq,
} from './speakingListeningMcqBank'
import { knowledgeMcqOptionsShuffledForTask } from './knowledgeMcqOptionShuffle'
import { listeningMcqItemWithShuffledOptions } from './listeningMcqOptionShuffle'
import {
  personalizeListeningMcqOptionLabelNl,
  personalizeListeningMcqPrompts,
  pickListeningSpeakerNames,
} from './listeningSpeakerNamePersonalization'
import { pickSectionsForMode } from './profileRegistry/blueprintAccess'

type ExamPromptPack = {
  nl: string
  en: string
  hints?: string[]
  example?: string
  /** Spoken passage for listening tasks (TTS). */
  audioScriptNl?: string
  /** Optional TTS scenario for speaking Part 1 (video proxy); instruction stays in nl/en. */
  scenarioScriptNl?: string
}

function levelTimeMul(level: ExamLevel): number {
  if (level === 'A1') return 0.95
  if (level === 'B1') return 1.08
  return 1
}

const PROMPTS: Record<ExamTaskType, Record<ExamLevel, ExamPromptPack>> = {
  practical_request: {
    A1: {
      nl: 'Vraag beleefd om een glas water in een restaurant.',
      en: 'Politely ask for a glass of water in a restaurant.',
      hints: ['Gebruik “mag ik” of “alstublieft”.', 'Korte zin is prima.'],
      example: 'Mag ik alstublieft een glas water?',
    },
    A2: {
      nl: 'Je belt de huisartsenpost. Vraag om een afspraak morgenochtend.',
      en: 'You call the out-of-hours GP. Ask for an appointment tomorrow morning.',
      hints: ['Zeg wie je bent (kort).', 'Noem “morgenochtend”.'],
      example: 'Goedenavond, ik wil graag een afspraak morgenochtend.',
      scenarioScriptNl: 'Het is avond. U bent zorgwekkend ziek en belt de huisartsenpost voor een afspraak morgenochtend.',
    },
    B1: {
      nl: 'Schrijf een korte vraag aan de verhuurder om een reparatie aan de verwarming.',
      en: 'Ask your landlord in writing for a heating repair — concise and formal-neutral.',
      hints: ['Noem het probleem + gewenste actie.', 'Blijf zakelijk vriendelijk.'],
      example: 'Beste heer/mevrouw, de verwarming doet het niet goed. Kunt u een monteur sturen?',
    },
  },
  short_response: {
    A1: {
      nl: 'Waar woon je? Geef één of twee zinnen.',
      en: 'Where do you live? Give one or two sentences.',
      hints: ['Plaats + stad is genoeg.'],
      example: 'Ik woon in Amsterdam, bij het park.',
    },
    A2: {
      nl: 'Beschrijf kort je route naar werk met het OV.',
      en: 'Briefly describe your commute by public transport.',
      hints: ['Gebruik woorden als “bus”, “trein”, “ overstappen”.'],
      example: 'Ik pak eerst de bus naar het station. Daarna neem ik de trein naar mijn werk.',
      scenarioScriptNl: 'In een korte video vraagt een interviewer: “Hoe reist u naar uw werk met het openbaar vervoer?”',
    },
    B1: {
      nl: 'Leg uit waarom je liever thuiswerkt dan op kantoor.',
      en: 'Explain why you prefer working from home over the office.',
      hints: ['Geef minstens twee redenen.', 'Gebruik verbindende woorden.'],
    },
  },
  roleplay: {
    A1: {
      nl: 'Je bent in de supermarkt. Vraag waar de melk is.',
      en: 'Supermarket role-play: ask where the milk is.',
      hints: ['Eén duidelijke vraag.'],
    },
    A2: {
      nl: 'Je belt een vriend om een afspraak te verzetten.',
      en: 'Call a friend to reschedule a meet-up.',
      hints: ['Excuses kort, nieuwe optie noemen.'],
    },
    B1: {
      nl: 'Je belt de bank over een onbekende afschrijving — blijf rustig en duidelijk.',
      en: 'Call the bank about an unknown charge — stay calm and clear.',
      hints: ['Vraag om verificatie + vervolgstap.'],
    },
  },
  describe_situation: {
    A1: {
      nl: 'Beschrijf je kamer in twee zinnen.',
      en: 'Describe your room in two sentences.',
    },
    A2: {
      nl: 'Er is file op de snelweg. Beschrijf wat je ziet en wat je doet.',
      en: 'Traffic jam on the highway — describe what you see and what you do.',
    },
    B1: {
      nl: 'Beschrijf een conflict op het werk en hoe je het aanpakt.',
      en: 'Describe a workplace conflict and how you handle it.',
    },
  },
  explain_process: {
    A1: {
      nl: 'Leg uit hoe je koffie maakt (3 stappen).',
      en: 'Explain how you make coffee (3 steps).',
      hints: ['Gebruik “eerst”, “dan”.'],
    },
    A2: {
      nl: 'Leg uit hoe je een brief post.',
      en: 'Explain how you mail a letter.',
    },
    B1: {
      nl: 'Leg het proces uit van solliciteren tot contract.',
      en: 'Explain the hiring process from application to contract.',
    },
  },
  give_opinion: {
    A1: {
      nl: 'Wat vind je van fietsen in de regen? Eén zin.',
      en: 'What do you think of cycling in the rain? One sentence.',
    },
    A2: {
      nl: 'Wat vind je van thuiswerken? Geef je mening + korte reden.',
      en: 'Opinion on working from home + short reason.',
    },
    B1: {
      nl: 'Geef je mening over strengere milieuregels voor bedrijven.',
      en: 'Opinion on stricter environmental rules for companies.',
    },
  },
  justify_reason: {
    A1: {
      nl: 'Waarom leer je Nederlands? (kort)',
      en: 'Why are you learning Dutch? (short)',
    },
    A2: {
      nl: 'Waarom kies je voor de trein in plaats van de auto?',
      en: 'Why choose the train instead of the car?',
    },
    B1: {
      nl: 'Onderbouw waarom diversiteit op de werkvloer helpt.',
      en: 'Justify why workplace diversity helps.',
    },
  },
  follow_up_response: {
    A1: {
      nl: 'De ander zegt: “Ik ben moe.” Reageer vriendelijk.',
      en: 'They say “I’m tired.” Respond kindly.',
    },
    A2: {
      nl: 'De ander: “Ik heb mijn sleutels vergeten.” Geef een nuttige reactie.',
      en: 'They forgot their keys — give a helpful response.',
      scenarioScriptNl: 'Uw huisgenoot staat voor de deur en zegt dat de sleutels binnen liggen.',
    },
    B1: {
      nl: 'De ander twijfelt aan je voorstel. Reageer en verdiep je antwoord.',
      en: 'They doubt your proposal — respond and deepen your answer.',
    },
  },
  compare_options: {
    A1: {
      nl: 'Bus of tram — wat is voor jou beter? Eén zin.',
      en: 'Bus or tram — which is better for you? One sentence.',
    },
    A2: {
      nl: 'Vergelijk twee weekendplannen en kies er een met uitleg.',
      en: 'Compare two weekend plans and pick one with explanation.',
    },
    B1: {
      nl: 'Vergelijk twee opleidingsroutes; noem voor- en nadelen.',
      en: 'Compare two study routes; mention pros and cons.',
    },
  },
  storytelling: {
    A1: {
      nl: 'Vertel in 3 zinnen wat je gisteren deed.',
      en: 'Say in 3 sentences what you did yesterday.',
    },
    A2: {
      nl: 'Vertel een kort verhaal over een vervelende reis.',
      en: 'Short story about an annoying trip.',
    },
    B1: {
      nl: 'Vertel een situatie waarin je een fout maakte en wat je leerde.',
      en: 'A situation where you made a mistake and what you learned.',
    },
  },
  sequencing: {
    A1: {
      nl: 'Zet in de goede volgorde: opstaan — ontbijten — werken. Gebruik “eerst/dan”.',
      en: 'Order: wake up — breakfast — work. Use first/then.',
    },
    A2: {
      nl: 'Leg de stappen uit om een afspraak online te maken.',
      en: 'Steps to book an appointment online.',
    },
    B1: {
      nl: 'Leg een technische procedure uit die je op je werk kent.',
      en: 'Explain a technical procedure you know from work.',
    },
  },
  read_aloud_exam: {
    A1: {
      nl: 'Lees hardop (in je antwoord): “De bus komt om acht uur.”',
      en: 'Read aloud in your answer: “De bus komt om acht uur.”',
    },
    A2: {
      nl: 'Lees de zin hardop en leg in één zin uit wat het betekent.',
      en: 'Read the sentence aloud and explain in one sentence.',
    },
    B1: {
      nl: 'Lees een formele zin hardop en parafraseer daarna neutraler.',
      en: 'Read a formal sentence aloud, then paraphrase more neutrally.',
    },
  },
  listening_response_exam: {
    A1: {
      audioScriptNl: 'De trein heeft vijf minuten vertraging. Excuses voor het ongemak.',
      nl: 'Wat zeg je kort terug tegen de reiziger die naast je staat?',
      en: 'Listen to the clip, then give a short natural reply in Dutch.',
    },
    A2: {
      audioScriptNl:
        'Aandacht reizigers: bus tien rijdt vandaag niet. Neem bus vijf naar het centraal station en stap daar over.',
      nl: 'Wat moet je doen om op je bestemming te komen volgens de omleiding?',
      en: 'Listen to the announcement, then explain in Dutch what you should do.',
    },
    B1: {
      audioScriptNl:
        'Gemeentebericht: de inloopspreekuur verhuist tijdelijk naar het stadhuis, ingang west, vanaf maandag.',
      nl: 'Vat samen waar inwoners nu terechtkunnen en noem één praktisch gevolg.',
      en: 'Listen carefully, then summarize where residents can go and one practical consequence.',
    },
  },
  writing_task_exam: {
    A1: {
      nl: 'Schrijf een korte sms dat je te laat bent (max. 2 zinnen).',
      en: 'Write a short text message that you will be late (max 2 sentences).',
    },
    A2: {
      nl: 'De weekvergadering moet verplaatst worden; je team moet weten waar en wanneer jullie elkaar nu treffen. Schrijf een korte professionele mail in het Nederlands: leg de wijziging uit, noem zelf een nieuwe dag, tijd en plek, en vraag kort om reactie als iets niet uitkomt. Gebruik geen Engels in je antwoord.',
      en: '',
    },
    B1: {
      nl: 'Schrijf een bondige klachtenmail met gewenste oplossing.',
      en: 'Write a concise complaint email with desired resolution.',
    },
  },
  knowledge_mcq: {
    A1: { nl: '', en: '' },
    A2: { nl: '', en: '' },
    B1: { nl: '', en: '' },
  },
  listening_mcq_exam: {
    A1: { nl: '', en: '' },
    A2: { nl: '', en: '' },
    B1: { nl: '', en: '' },
  },
}

function pickPrompt(taskType: ExamTaskType, level: ExamLevel): ExamPromptPack {
  return PROMPTS[taskType]?.[level] ?? PROMPTS.practical_request[level]
}

/** Deterministic index so the same session + task index always picks the same variant. */
function stablePromptVariantIndex(
  sessionSeed: string,
  taskIndex: number,
  taskType: ExamTaskType,
  modulo: number,
): number {
  if (modulo <= 1) return 0
  let h = 2166136261
  const s = `${sessionSeed}\0${taskIndex}\0${taskType}`
  for (let k = 0; k < s.length; k += 1) {
    h ^= s.charCodeAt(k)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % modulo
}

function pickPromptForTask(
  taskType: ExamTaskType,
  level: ExamLevel,
  sessionSeed: string,
  taskIndex: number,
): ExamPromptPack {
  const base = PROMPTS[taskType]?.[level]
  const extras = EXAM_PROMPT_VARIANT_BANKS[taskType]?.[level]
  const bank: ExamPromptPack[] =
    extras && extras.length > 0
      ? [...extras, ...(base ? [base] : [])]
      : base
        ? [base]
        : [pickPrompt(taskType, level)]
  const idx = stablePromptVariantIndex(sessionSeed, taskIndex, taskType, bank.length)
  return bank[idx]!
}

function flattenWithSections(
  profile: ExamProfile,
  mode: ExamRunMode,
  scope: ExamScope,
  sectionId?: string,
): { sectionId: string; bp: ExamTaskBlueprint }[] {
  const sections = pickSectionsForMode(profile, mode)
  if (scope === 'full') {
    const r: { sectionId: string; bp: ExamTaskBlueprint }[] = []
    for (const sec of sections) {
      for (const t of sec.tasks) {
        for (let c = 0; c < t.count; c += 1) {
          r.push({ sectionId: sec.id, bp: { ...t, count: 1 } })
        }
      }
    }
    return r
  }
  const sec = sections.find((s) => s.id === sectionId) ?? sections[0]
  const r: { sectionId: string; bp: ExamTaskBlueprint }[] = []
  for (const t of sec.tasks) {
    for (let c = 0; c < t.count; c += 1) {
      r.push({ sectionId: sec.id, bp: { ...t, count: 1 } })
    }
  }
  return r
}

export function generateExamTasks(params: {
  profile: ExamProfile
  level: ExamLevel
  mode: ExamRunMode
  scope: ExamScope
  sectionId?: string
  sessionSeed: string
}): ExamTaskInstance[] {
  let flat = flattenWithSections(params.profile, params.mode, params.scope, params.sectionId)
  const mul = levelTimeMul(params.level)

  /** A2 Schrijven sim: four bank prompts in ~40 min — full exam run or hub “quick” section run on `a2_writing_examen`. */
  const useA2WritingSimBank =
    params.profile.examCode === 'inburgering_writing' &&
    params.level === 'A2' &&
    params.mode === 'simulation' &&
    (params.scope === 'full' ||
      (params.scope === 'section' &&
        (params.sectionId === 'a2_writing_examen' || params.sectionId === undefined)))

  let a2WritingPickIndices: number[] | null = null
  let a2WritingSlot = 0

  if (useA2WritingSimBank) {
    const n = pickA2WritingSimulationTaskCount(params.sessionSeed)
    a2WritingPickIndices =
      n === 4
        ? pickA2WritingStratifiedBankIndices(params.sessionSeed, A2_WRITING_EXAM_QUESTION_BANK)
        : sampleUniqueIndices(params.sessionSeed, 'a2-writing-bank-v1', n, A2_WRITING_EXAM_QUESTION_BANK.length)
    const wallSec = 40 * 60
    const floorPer = Math.floor(wallSec / n)
    let prepW = Math.max(12, Math.min(28, Math.round(floorPer * 0.14)))
    let ansBase = floorPer - prepW
    if (ansBase < 50) {
      ansBase = 50
      prepW = Math.max(12, floorPer - ansBase)
    }
    const allocated = n * (prepW + ansBase)
    const remainder = wallSec - allocated
    const first = flat[0]
    if (!first || first.bp.taskType !== 'writing_task_exam') {
      throw new Error('A2 writing profile: expected writing_task_exam as first simulation task')
    }
    flat = Array.from({ length: n }, (_, j) => ({
      sectionId: first.sectionId,
      bp: {
        ...first.bp,
        count: 1,
        prepSeconds: prepW,
        answerSeconds: ansBase + (j < remainder ? 1 : 0),
      },
    }))
  }

  /** Full official format (25 items, 65 min) whenever the flattened sim is only the A2 reading exam section — including hub "section" quick start. */
  const useA2ReadingFullSim =
    params.profile.examCode === 'inburgering_reading' &&
    params.level === 'A2' &&
    params.mode === 'simulation' &&
    flat.length > 0 &&
    flat.every((row) => row.sectionId === 'a2_reading_examen' && row.bp.taskType === 'knowledge_mcq')

  let a2ReadingPickIndices: number[] | null = null
  let a2ReadingSlot = 0

  if (useA2ReadingFullSim) {
    const n = 25
    const wallSec = 65 * 60
    a2ReadingPickIndices = sampleUniqueIndices(
      params.sessionSeed,
      'a2-reading-exam-v1',
      n,
      A2_READING_EXAM_MCQ_POOL.length,
    )
    const floorPer = Math.floor(wallSec / n)
    let prepR = Math.max(15, Math.min(40, Math.round(floorPer * 0.2)))
    let ansBase = floorPer - prepR
    if (ansBase < 50) {
      ansBase = 50
      prepR = Math.max(15, floorPer - ansBase)
    }
    const allocated = n * (prepR + ansBase)
    const remainder = wallSec - allocated
    const first = flat[0]
    if (!first || first.bp.taskType !== 'knowledge_mcq') {
      throw new Error('A2 reading profile: expected knowledge_mcq as first simulation task')
    }
    flat = Array.from({ length: n }, (_, j) => ({
      sectionId: first.sectionId,
      bp: {
        ...first.bp,
        count: 1,
        prepSeconds: prepR,
        answerSeconds: ansBase + (j < remainder ? 1 : 0),
      },
    }))
  }

  /**
   * Official-style KNM exam block: 40 MCQs in 45 minutes (same whether the learner starts full exam or the
   * `a2_knm_examen` section from the hub — mirrors A2 reading exam section behaviour).
   */
  const useA2KnmExamSimBlock =
    params.profile.examCode === 'inburgering_knm' &&
    params.level === 'A2' &&
    params.mode === 'simulation' &&
    flat.length > 0 &&
    flat.every((row) => row.sectionId === 'a2_knm_examen' && row.bp.taskType === 'knowledge_mcq')

  let a2KnmPickIndices: number[] | null = null
  let a2KnmSlot = 0

  if (useA2KnmExamSimBlock) {
    const n = 40
    const wallSec = 45 * 60
    a2KnmPickIndices = sampleA2KnmExamPoolIndices(params.sessionSeed)
    const floorPer = Math.floor(wallSec / n)
    let prepK = Math.max(12, Math.min(30, Math.round(floorPer * 0.28)))
    let ansBase = floorPer - prepK
    if (ansBase < 28) {
      ansBase = 28
      prepK = Math.max(12, floorPer - ansBase)
    }
    const allocated = n * (prepK + ansBase)
    const remainder = wallSec - allocated
    const first = flat[0]
    if (!first || first.bp.taskType !== 'knowledge_mcq') {
      throw new Error('A2 KNM profile: expected knowledge_mcq as first simulation task')
    }
    flat = Array.from({ length: n }, (_, j) => ({
      sectionId: first.sectionId,
      bp: {
        ...first.bp,
        count: 1,
        prepSeconds: prepK,
        answerSeconds: ansBase + (j < remainder ? 1 : 0),
      },
    }))
  }

  const useA2SpeakingBanks =
    params.profile.examCode === 'inburgering_speaking' && params.level === 'A2'
  const useA2StandaloneListening =
    params.profile.examCode === 'inburgering_listening' && params.level === 'A2'
  const a2StandaloneListeningSeq = useA2StandaloneListening
    ? buildA2StandaloneListeningExamSequence(params.sessionSeed)
    : null
  const a2Part1PickIndices = useA2SpeakingBanks
    ? sampleUniqueIndices(params.sessionSeed, 'a2-speaking-part1-v1', 12, A2_PART1_QUESTION_BANK.length)
    : null
  const a2Part2PickIndices = useA2SpeakingBanks
    ? sampleUniqueIndices(params.sessionSeed, 'a2-speaking-part2-v1', 12, A2_SPEAKING_LISTENING_MCQ_POOL.length)
    : null
  let a2Part1Slot = 0
  let a2Part2Slot = 0
  let a2StandaloneListeningSlot = 0
  const out: ExamTaskInstance[] = []
  let i = 0
  for (const { sectionId, bp } of flat) {
    if (useA2SpeakingBanks && sectionId === 'a2_speaking_part1' && a2Part1PickIndices) {
      const bankIdx = a2Part1PickIndices[a2Part1Slot]!
      a2Part1Slot += 1
      const bankItem = A2_PART1_QUESTION_BANK[bankIdx]!
      const tmpl = a2Part1BlueprintForTaskType(bankItem.taskType)
      const hintsAllowed = params.mode === 'training' && bp.training.hintsAllowed
      const examplesAllowed = params.mode === 'training' && bp.training.examplesAllowed
      const listeningScriptNl = bankItem.scenarioScriptNl?.trim()
      /** Bank sample is persisted on simulation tasks too — the simulation report shows it; the timed run never does. */
      const bankExampleNl = bankItem.example?.trim() ? bankItem.example.trim() : undefined
      const trainingExampleNl =
        bankExampleNl && (params.mode === 'simulation' || examplesAllowed) ? bankExampleNl : undefined
      out.push({
        id: `task-${i}`,
        taskType: bankItem.taskType,
        sectionId,
        level: params.level,
        promptNl: bankItem.nl,
        promptEn: bankItem.en,
        prepSeconds: Math.round(tmpl.prepSeconds * mul),
        answerSeconds: Math.round(tmpl.answerSeconds * mul),
        trainingHintsNl: hintsAllowed && bankItem.hints?.length ? bankItem.hints : undefined,
        trainingExampleNl,
        scoringDimensions: tmpl.scoringDimensions,
        ...(listeningScriptNl ? { listeningScriptNl } : {}),
      })
      i += 1
      continue
    }

    if (bp.taskType === 'listening_mcq_exam') {
      const slotPack =
        useA2StandaloneListening && a2StandaloneListeningSeq
          ? a2StandaloneListeningSeq[a2StandaloneListeningSlot]!
          : null
      if (slotPack) a2StandaloneListeningSlot += 1
      const itemRaw =
        slotPack?.item ??
        (useA2SpeakingBanks && a2Part2PickIndices
          ? getA2SpeakingListeningMcqByPoolIndex(a2Part2PickIndices[a2Part2Slot]!)
          : pickSpeakingListeningMcq(params.level, params.sessionSeed, i))
      if (useA2SpeakingBanks && a2Part2PickIndices && !slotPack) a2Part2Slot += 1
      const item = listeningMcqItemWithShuffledOptions(
        itemRaw,
        params.sessionSeed,
        `${i}:${itemRaw.dialogueNl.slice(0, 96)}`,
      )
      const hintsAllowed = params.mode === 'training' && bp.training.hintsAllowed
      const speakerNameSeed = `${params.sessionSeed}:${i}:${item.dialogueNl}:${item.questionNl}`
      const { nameA, nameB } = pickListeningSpeakerNames(speakerNameSeed)
      const { promptNl, promptEn } = personalizeListeningMcqPrompts(
        item.questionNl,
        item.questionEn,
        nameA,
        nameB,
      )
      out.push({
        id: `task-${i}`,
        taskType: 'listening_mcq_exam',
        sectionId,
        level: params.level,
        promptNl,
        promptEn,
        listeningSpeakerNameSeed: speakerNameSeed,
        prepSeconds: Math.round(bp.prepSeconds * mul),
        answerSeconds: Math.round(bp.answerSeconds * mul),
        listeningScriptNl: item.dialogueNl.trim(),
        ...(slotPack
          ? {
              listeningScenarioId: slotPack.scenarioId,
              listeningScenarioTitleNl: slotPack.scenarioTitleNl,
              listeningScenarioIndex1Based: slotPack.scenarioIndex1Based,
              listeningScenarioCount: slotPack.scenarioCount,
              listeningScenarioQuestionIndex: slotPack.questionIndexInScenario,
              listeningScenarioQuestionCount: slotPack.questionsInScenario,
            }
          : {}),
        trainingHintsNl: hintsAllowed
          ? ['Luister eerst het hele gesprek.', 'Let op wie wat voorstelt of vraagt.']
          : undefined,
        scoringDimensions: bp.scoringDimensions,
        mcq: {
          options: item.options.map((o) => ({
            ...o,
            label: personalizeListeningMcqOptionLabelNl(o.label, nameA, nameB),
          })),
          correctOptionIds: item.correctOptionIds,
        },
      })
      i += 1
      continue
    }

    if (bp.taskType === 'writing_task_exam' && a2WritingPickIndices) {
      const bankIdx = a2WritingPickIndices[a2WritingSlot]!
      a2WritingSlot += 1
      const bankItem = getA2WritingExamBankItem(bankIdx)
      const hintsAllowed = params.mode === 'training' && bp.training.hintsAllowed
      const examplesAllowed = params.mode === 'training' && bp.training.examplesAllowed
      /** Bank sample: persisted on simulation tasks for the report (run UI never shows examples in sim). */
      const bankExampleNl = bankItem.example?.trim() ? bankItem.example.trim() : undefined
      const trainingExampleNl =
        bankExampleNl && (params.mode === 'simulation' || (params.mode === 'training' && examplesAllowed))
          ? bankExampleNl
          : undefined
      out.push({
        id: `task-${i}`,
        taskType: 'writing_task_exam',
        sectionId,
        level: params.level,
        promptNl: bankItem.nl,
        promptEn: bankItem.en,
        prepSeconds: Math.round(bp.prepSeconds * mul),
        answerSeconds: Math.round(bp.answerSeconds * mul),
        trainingHintsNl: hintsAllowed && bankItem.hints?.length ? bankItem.hints : undefined,
        trainingExampleNl,
        scoringDimensions: bankItem.scoringDimensions ?? bp.scoringDimensions,
        writingExamStratum: bankItem.stratum,
        ...(bankItem.fillInBulletsNl?.length
          ? {
              writingFillInBulletsNl: [...bankItem.fillInBulletsNl],
              ...(bankItem.answerSkeletonNl?.trim()
                ? { writingAnswerSkeletonNl: bankItem.answerSkeletonNl.trim() }
                : {}),
            }
          : {}),
      })
      i += 1
      continue
    }

    if (bp.taskType === 'knowledge_mcq') {
      const useReadingBank = Boolean(a2ReadingPickIndices)
      const useA2KnmExam = Boolean(a2KnmPickIndices)
      const item = useReadingBank
        ? getA2ReadingExamMcqByPoolIndex(a2ReadingPickIndices![a2ReadingSlot]!)
        : useA2KnmExam
          ? getA2KnmMcqByPoolIndex(a2KnmPickIndices![a2KnmSlot]!)
          : pickKnmMcq(params.level, params.sessionSeed, i)
      if (useReadingBank) a2ReadingSlot += 1
      else if (useA2KnmExam) a2KnmSlot += 1
      const hintsAllowed = params.mode === 'training' && bp.training.hintsAllowed
      /** Reading-exam MCQs: only attach stem audio when the bank provides a script (avoid TTS-reading a long passage). Other MCQs: spoken line must match the on-screen stem — use `questionNl`, not a separate summary script. */
      const stemAudioNl = useReadingBank
        ? item.audioScriptNl?.trim()
        : item.questionNl.replace(/\s+/g, ' ').trim()
      out.push({
        id: `task-${i}`,
        taskType: 'knowledge_mcq',
        sectionId,
        level: params.level,
        promptNl: item.questionNl,
        promptEn: item.questionEn,
        ...(item.passageEn?.trim() ? { readingPassageEn: item.passageEn.trim() } : {}),
        prepSeconds: Math.round(bp.prepSeconds * mul),
        answerSeconds: Math.round(bp.answerSeconds * mul),
        trainingHintsNl: hintsAllowed
          ? item.correctOptionIds.length > 1
            ? [
                'Meerdere antwoorden kunnen goed zijn — vink alles aan dat echt klopt.',
                'Je score is alleen goed als je precies de juiste combinatie kiest.',
              ]
            : stemAudioNl
              ? ['Luister de vraag nog een keer als het moet.', 'Kies wat het beste past bij de Nederlandse praktijk.']
              : ['Lees elke optie rustig.', 'Kies wat het beste past bij de Nederlandse praktijk.']
          : undefined,
        scoringDimensions: bp.scoringDimensions,
        mcq: {
          ...(item.illustrationId ? { illustrationId: item.illustrationId } : {}),
          ...(item.questionImageUrl ? { questionImageUrl: item.questionImageUrl } : {}),
          options: knowledgeMcqOptionsShuffledForTask(item.options, params.sessionSeed, `task-${i}`),
          correctOptionIds: item.correctOptionIds,
        },
        ...(stemAudioNl ? { listeningScriptNl: stemAudioNl } : {}),
      })
      i += 1
      continue
    }

    const pack = pickPromptForTask(bp.taskType, params.level, params.sessionSeed, i)
    const hintsAllowed = params.mode === 'training' && bp.training.hintsAllowed
    const examplesAllowed = params.mode === 'training' && bp.training.examplesAllowed
    const listeningScriptNl =
      bp.taskType === 'listening_response_exam' && pack.audioScriptNl?.trim()
        ? pack.audioScriptNl.trim()
        : pack.scenarioScriptNl?.trim()
          ? pack.scenarioScriptNl.trim()
          : undefined
    /** Bank sample is persisted on simulation tasks too — used by the simulation report; never shown mid-run. */
    const packExampleNl = pack.example?.trim() ? pack.example.trim() : undefined
    const trainingExampleNl =
      packExampleNl && (params.mode === 'simulation' || examplesAllowed) ? packExampleNl : undefined
    out.push({
      id: `task-${i}`,
      taskType: bp.taskType,
      sectionId,
      level: params.level,
      promptNl: pack.nl,
      promptEn: pack.en,
      prepSeconds: Math.round(bp.prepSeconds * mul),
      answerSeconds: Math.round(bp.answerSeconds * mul),
      trainingHintsNl: hintsAllowed && pack.hints?.length ? pack.hints : undefined,
      trainingExampleNl,
      scoringDimensions: bp.scoringDimensions,
      ...(listeningScriptNl ? { listeningScriptNl } : {}),
    })
    i += 1
  }
  return out
}
