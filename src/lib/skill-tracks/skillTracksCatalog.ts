import { skillTrackCatalogSchema, type SkillTrackCatalog, type SkillTrackDefinition } from '@/lib/schemas/practice/skillTrack.schema'

const meta = {}

function mcq(
  id: string,
  title: string,
  instructions: string,
  prompt: string,
  options: string[],
  correctIndex: number,
  fb?: { ok?: string; no?: string }
) {
  return {
    kind: 'mcq' as const,
    id,
    title,
    instructions,
    prompt,
    options,
    correctIndex,
    feedbackCorrect: fb?.ok,
    feedbackWrong: fb?.no,
  }
}

function typed(
  id: string,
  title: string,
  instructions: string,
  prompt: string,
  acceptableAnswers: string[],
  placeholder?: string
) {
  return {
    kind: 'typed_check' as const,
    id,
    title,
    instructions,
    prompt,
    acceptableAnswers,
    placeholder,
    caseInsensitive: true as const,
    feedbackCorrect: 'Nice — clear and usable.',
    feedbackWrong: 'Try a short Dutch line; check spelling and word order.',
  }
}

function read(
  id: string,
  title: string,
  instructions: string,
  passage: string,
  question: string,
  options: string[],
  correctIndex: number
) {
  return {
    kind: 'reading_mcq' as const,
    id,
    title,
    instructions,
    passage,
    question,
    options,
    correctIndex,
    feedbackCorrect: 'You found the key info.',
    feedbackWrong: 'Skim again for times, prices, or action words.',
  }
}

function speak(
  id: string,
  title: string,
  instructions: string,
  modelNl: string,
  modelEn: string | undefined,
  task: string,
  selfCheckReminder: string
) {
  return {
    kind: 'speaking_prompt' as const,
    id,
    title,
    instructions,
    modelNl,
    modelEn,
    task,
    selfCheckReminder,
  }
}

function repair(
  id: string,
  title: string,
  instructions: string,
  contextNl: string,
  contextEn: string | undefined,
  prompt: string,
  options: string[],
  correctIndex: number
) {
  return {
    kind: 'repair_mcq' as const,
    id,
    title,
    instructions,
    contextNl,
    contextEn,
    prompt,
    options,
    correctIndex,
    feedbackCorrect: 'That keeps the talk going calmly.',
    feedbackWrong: 'Repair phrases are short and polite — try the clearest option.',
  }
}

const RAW_CATALOG: SkillTrackCatalog = {
  version: 1,
  tracks: [
    {
      id: 'speaking_fluency',
      title: 'Speaking fluency',
      purpose: 'Say useful Dutch out loud with less freezing — short turns, clear models, gentle pressure.',
      icon: '🎙️',
      estimatedMinutesPerSession: 4,
      premiumDeepLevels: true,
      metadata: meta,
      levels: [
        {
          index: 0,
          label: 'beginner',
          title: 'Beginner · Echo & swap',
          summary: 'Repeat a model line, then swap one word.',
          exercises: [
            speak(
              'sp-l0-e1',
              'Say it like the model',
              'Read the Dutch aloud twice, slowly. Tap done when you’ve said it.',
              'Goedemorgen, ik heb een afspraak.',
              'Good morning, I have an appointment.',
              'Say it out loud with calm rhythm — same melody as the model.',
              'Good. Even a rough pronunciation counts — you activated your speaking muscles.'
            ),
            mcq(
              'sp-l0-e2',
              'Pick the natural line',
              'Which version sounds most natural at the desk?',
              'You want to ask someone to wait a moment.',
              [
                'Een moment, alstublieft.',
                'Moment, ik wil wachten nu.',
                'Ik ben een moment.',
              ],
              0
            ),
          ],
          metadata: meta,
        },
        {
          index: 1,
          label: 'building',
          title: 'Building · Short answer',
          summary: 'Answer a tiny prompt in your own words (type for now — say it aloud too).',
          exercises: [
            typed(
              'sp-l1-e1',
              'One sentence',
              'Type a polite Dutch sentence: you’re late for an appointment.',
              'Type your line in Dutch (one short sentence).',
              ['sorry', 'te laat', 'afspraak'],
              'Ik ben …'
            ),
            speak(
              'sp-l1-e2',
              'Stress practice',
              'Say the line; exaggerate stress on the bold idea.',
              'Ik wil **graag** een koffie, alstublieft.',
              'I would like a coffee, please.',
              'Stress “graag” — it softens the request.',
              'Smooth beats perfect. If you said it twice, that’s a win.'
            ),
          ],
          metadata: meta,
        },
        {
          index: 2,
          label: 'strong',
          title: 'Strong · Less scaffolding',
          summary: 'Choose and produce with lighter hints.',
          premiumLocked: true,
          exercises: [
            mcq(
              'sp-l2-e1',
              'Fast pick',
              'You didn’t catch the price. What do you say?',
              'Choose the best repair line.',
              [
                'Kunt u dat herhalen, alstublieft?',
                'Ik weet niet wat is prijs.',
                'Hoeveel kost het altijd?',
              ],
              0
            ),
            typed(
              'sp-l2-e2',
              'Mini monologue',
              'Explain you need help with your OV-chipkaart (one or two short sentences).',
              'Write in Dutch.',
              ['ov', 'chipkaart', 'help', 'hulp'],
              'Ik heb hulp nodig met…'
            ),
          ],
          metadata: meta,
        },
        {
          index: 3,
          label: 'confident',
          title: 'Confident · Flow',
          summary: 'Tighter choices + fuller line.',
          premiumLocked: true,
          exercises: [
            speak(
              'sp-l3-e1',
              'Under time pressure',
              'Imagine 5 seconds — say this clearly once.',
              'Waar kan ik inloggen op de computer?',
              'Where can I log in on the computer?',
              'Say it once without stopping mid-way.',
              'If you finished the full sentence, count it as success.'
            ),
            mcq(
              'sp-l3-e2',
              'Natural follow-up',
              'After “Tot ziens”, you want to confirm tomorrow. Pick the best line.',
              'Choose one.',
              ['Tot morgen!', 'Ik ben morgen tot ziens.', 'Morgen is goed, tot dan.'],
              2
            ),
          ],
          metadata: meta,
        },
      ],
    },
    {
      id: 'listening_confidence',
      title: 'Listening confidence',
      purpose: 'Catch meaning from short practical Dutch — gist first, then detail (text stand-in until audio clips ship).',
      icon: '🎧',
      estimatedMinutesPerSession: 3,
      metadata: meta,
      levels: [
        {
          index: 0,
          label: 'beginner',
          title: 'Beginner · Gist',
          summary: 'Very short “heard” lines — what’s the main idea?',
          exercises: [
            read(
              'ls-l0-e1',
              'What is this about?',
              'You “hear” a station announcement (text for now).',
              'De trein naar Utrecht vertrekt van spoor 3. Excuses voor de vertraging.',
              'What is the platform?',
              ['Spoor 2', 'Spoor 3', 'Utrecht'],
              1
            ),
            read(
              'ls-l0-e2',
              'Key detail',
              'Shop PA:',
              'Let op: de winkel sluit over vijf minuten. Graag naar de kassa.',
              'What happens soon?',
              ['The shop opens', 'The shop closes in 5 minutes', 'The cash register is broken'],
              1
            ),
          ],
          metadata: meta,
        },
        {
          index: 1,
          label: 'building',
          title: 'Building · Two details',
          summary: 'Hold two facts from one line.',
          exercises: [
            read(
              'ls-l1-e1',
              'Appointment',
              'Phone message:',
              'Hallo, dit is de huisartsenpraktijk. Uw afspraak is morgen om 10:30. Bel terug als het niet past.',
              'When is the appointment?',
              ['Today 10:30', 'Tomorrow 10:30', 'Tomorrow evening'],
              1
            ),
            mcq(
              'ls-l1-e2',
              'Best summary',
              'You heard: “We hebben helaas geen bon meer. Ik geef u een kopie.”',
              'What’s the situation?',
              ['They have many receipts', 'No receipt left — they offer a copy', 'You must pay again'],
              1
            ),
          ],
          metadata: meta,
        },
        {
          index: 2,
          label: 'strong',
          title: 'Strong · Denser line',
          summary: 'Slightly longer practical Dutch.',
          premiumLocked: true,
          exercises: [
            read(
              'ls-l2-e1',
              'Pharmacy',
              'Counter explanation:',
              'Dit medicijn drie keer per dag na het eten, met water. Bij misselijkheid: stoppen en bellen.',
              'How often per day?',
              ['Once', 'Three times after meals', 'Only if nauseous'],
              1
            ),
            read(
              'ls-l2-e2',
              'Gemeente snippet',
              'Letter opener:',
              'U ontvangt dit bericht omdat uw document nog ontbreekt. Lever het vóór 15 mei in.',
              'Why did you get this?',
              ['Document missing — deadline May 15', 'You won a prize', 'Appointment cancelled'],
              0
            ),
          ],
          metadata: meta,
        },
        {
          index: 3,
          label: 'confident',
          title: 'Confident · Mixed',
          summary: 'Pick the best interpretation fast.',
          premiumLocked: true,
          exercises: [
            mcq(
              'ls-l3-e1',
              'Inference',
              '“Het is druk vandaag; wilt u even wachten?”',
              'What should you do?',
              ['Leave immediately', 'Wait a bit', 'Complain loudly'],
              1
            ),
            read(
              'ls-l3-e2',
              'Schedule board',
              'Read the opening-hours line.',
              'Dinsdag gesloten. Woensdag 09:00–17:00.',
              'When are they closed?',
              ['Wednesday', 'Tuesday', 'Friday'],
              1
            ),
          ],
          metadata: meta,
        },
      ],
    },
    {
      id: 'reading_real_life',
      title: 'Reading in real life',
      purpose: 'Skim signs, messages, and notices for the one thing you need.',
      icon: '📖',
      estimatedMinutesPerSession: 3,
      metadata: meta,
      levels: [
        {
          index: 0,
          label: 'beginner',
          title: 'Beginner · Signs & labels',
          summary: 'Single-purpose text.',
          exercises: [
            read(
              'rd-l0-e1',
              'Sign',
              'On a door:',
              'INGANG',
              'What does it mean?',
              ['Exit', 'Entrance', 'Closed'],
              1
            ),
            read(
              'rd-l0-e2',
              'Opening hours',
              'Check the hours line.',
              'Ma–vr 08:00–18:00',
              'Are they open Monday morning at 9?',
              ['No', 'Yes', 'Only weekends'],
              1
            ),
          ],
          metadata: meta,
        },
        {
          index: 1,
          label: 'building',
          title: 'Building · Messages',
          summary: 'Short practical notes.',
          exercises: [
            read(
              'rd-l1-e1',
              'SMS style',
              'Short text message.',
              'Ik ben iets later. Ben er over 10 minuten.',
              'What should you expect?',
              ['They cancel', 'They arrive in ~10 minutes', 'They are angry'],
              1
            ),
            read(
              'rd-l1-e2',
              'Menu item',
              'Read the menu snippet.',
              'Dagsoep €4,50 · broodje kaas €3,20',
              'How much is the soup?',
              ['€3,20', '€4,50', '€5,00'],
              1
            ),
          ],
          metadata: meta,
        },
        {
          index: 2,
          label: 'strong',
          title: 'Strong · Notices',
          summary: 'Pick action + deadline.',
          premiumLocked: true,
          exercises: [
            read(
              'rd-l2-e1',
              'Building notice',
              'Rules in the shared laundry room.',
              'Wasmachine: niet gebruiken na 22:00. Storing melden bij de conciërge.',
              'What is the rule?',
              ['No laundry after 22:00', 'Free laundry all night', 'Call police'],
              0
            ),
            read(
              'rd-l2-e2',
              'Email subject',
              'Read the subject line.',
              'Onderwerp: Bevestiging afspraak huisarts – 14 juni 11:15',
              'What is confirmed?',
              ['GP appointment June 14 11:15', 'Job interview', 'Train ticket'],
              0
            ),
          ],
          metadata: meta,
        },
        {
          index: 3,
          label: 'confident',
          title: 'Confident · Mixed formats',
          summary: 'Faster key-info pull.',
          premiumLocked: true,
          exercises: [
            read(
              'rd-l3-e1',
              'App notification',
              'Delivery update on your phone.',
              'Uw pakket wordt vandaag tussen 12:00 en 15:00 bezorgd.',
              'When might the package arrive?',
              ['Morning only', 'Between noon and 3 pm', 'Never'],
              1
            ),
            mcq(
              'rd-l3-e2',
              'Best action',
              'Poster: “Meldt verloren voorwerpen bij de balie.”',
              'What do you do if you lost something?',
              ['Go to the desk', 'Ignore it', 'Shout outside'],
              0
            ),
          ],
          metadata: meta,
        },
      ],
    },
    {
      id: 'writing_messages',
      title: 'Writing simple messages',
      purpose: 'Send short Dutch that sounds polite and clear — WhatsApp, email, work chat.',
      icon: '✉️',
      estimatedMinutesPerSession: 4,
      premiumDeepLevels: true,
      metadata: meta,
      levels: [
        {
          index: 0,
          label: 'beginner',
          title: 'Beginner · Fill the gap',
          summary: 'Complete a polite skeleton.',
          exercises: [
            typed(
              'wr-l0-e1',
              'Polite request',
              'Finish: you ask a colleague to send the file (use “alsjeblieft” or “alstublieft”).',
              'Type: Mag ik het bestand …',
              ['bestand', 'alsjeblieft', 'alstublieft', 'sturen'],
              'Mag ik het bestand …'
            ),
            mcq(
              'wr-l0-e2',
              'Tone',
              'Which line fits a landlord message?',
              'Choose the calm, clear one.',
              [
                'Ik betaal niet meer!!!',
                'Goedemiddag, ik heb een vraag over de huur. Groet, …',
                'Kom nu fixen!',
              ],
              1
            ),
          ],
          metadata: meta,
        },
        {
          index: 1,
          label: 'building',
          title: 'Building · One sentence',
          summary: 'Produce a full short message.',
          exercises: [
            typed(
              'wr-l1-e1',
              'Running late',
              'Write you’ll be 15 minutes late for a coffee meet-up (one sentence).',
              'Dutch only.',
              ['later', 'minuten', 'sorry', 'te laat'],
              'Ik ben …'
            ),
            typed(
              'wr-l1-e2',
              'Quick update',
              'Tell a friend you arrived safely home (short).',
              'Include “thuis” or “aangekomen”.',
              ['thuis', 'aangekomen', 'goed', 'veilig'],
              'Ik …'
            ),
          ],
          metadata: meta,
        },
        {
          index: 2,
          label: 'strong',
          title: 'Strong · Rewrite',
          summary: 'Make a rough line more natural.',
          premiumLocked: true,
          exercises: [
            mcq(
              'wr-l2-e1',
              'Better version',
              'Rough: “Ik wil nu afspraak morgen.”',
              'Pick the smoother line.',
              [
                'Ik wil nu morgen afspraak.',
                'Zou ik een afspraak kunnen maken voor morgen?',
                'Afspraak ik morgen wil.',
              ],
              1
            ),
            typed(
              'wr-l2-e2',
              'Landlord',
              'Politely report a small leak in the bathroom (two short sentences max).',
              'Include “lek” or “druppelt”.',
              ['lek', 'badkamer', 'melden', 'druppelt'],
              'Goedemiddag, …'
            ),
          ],
          metadata: meta,
        },
        {
          index: 3,
          label: 'confident',
          title: 'Confident · Independent',
          summary: 'Less hand-holding.',
          premiumLocked: true,
          exercises: [
            typed(
              'wr-l3-e1',
              'Sick leave',
              'Message to work: you’re ill and won’t come today (brief, polite).',
              'Use “ziek” or “niet komen”.',
              ['ziek', 'vandaag', 'werk', 'niet'],
              'Goedemorgen, …'
            ),
            mcq(
              'wr-l3-e2',
              'Close correctly',
              'Pick the best closing.',
              'Which sign-off fits semi-formal email?',
              ['Groetjes xoxo', 'Met vriendelijke groet', 'Bye bye now'],
              1
            ),
          ],
          metadata: meta,
        },
      ],
    },
    {
      id: 'conversation_repair',
      title: 'Reaction speed & repair',
      purpose: 'Keep talking when something breaks — repeat, clarify, fix politely under light time pressure.',
      icon: '⚡',
      estimatedMinutesPerSession: 3,
      metadata: meta,
      levels: [
        {
          index: 0,
          label: 'beginner',
          title: 'Beginner · Stock phrases',
          summary: 'Recognise safe repair lines.',
          exercises: [
            repair(
              'rp-l0-e1',
              'Too fast',
              'You’re at the desk; the employee talks very fast.',
              'De medewerker praat heel snel.',
              'The employee talks very fast.',
              'What do you say?',
              ['Kunt u dat langzamer zeggen?', 'Ik haat u.', 'Wat is Nederland?'],
              0
            ),
            repair(
              'rp-l0-e2',
              'Didn’t hear',
              'There’s noise; you missed the last part.',
              'Het is rumoerig bij de balie.',
              'It’s noisy at the counter.',
              'Ask to repeat once, politely.',
              [
                'Kunt u dat herhalen, alstublieft?',
                'Zeg niks.',
                'Ik weet alles.',
              ],
              0
            ),
          ],
          metadata: meta,
        },
        {
          index: 1,
          label: 'building',
          title: 'Building · Best reaction',
          summary: 'Choose the repair that fits the slip.',
          exercises: [
            repair(
              'rp-l1-e1',
              'Wrong item',
              'Wrong drink arrived.',
              'U heeft koffie gebracht, maar ik vroeg om thee.',
              'They brought coffee, but you asked for tea.',
              'What’s the calm fix?',
              [
                'Dit is niet goed — ik had thee gevraagd, alstublieft.',
                'Koffie is stom.',
                'Ik eet alles.',
              ],
              0
            ),
            mcq(
              'rp-l1-e2',
              'Clarify meaning',
              'You didn’t understand one word.',
              'Best line?',
              [
                'Wat betekent dat woord?',
                'Ik ben dom.',
                'Stop met praten.',
              ],
              0
            ),
          ],
          metadata: meta,
        },
        {
          index: 2,
          label: 'strong',
          title: 'Strong · Produce a line',
          summary: 'Type your own short repair.',
          exercises: [
            typed(
              'rp-l2-e1',
              'Misunderstanding',
              'You thought the appointment was Tuesday; they said Wednesday. Type one short clarifying question.',
              'Use “bedoelt” or “goed begrepen”.',
              ['bedoelt', 'woensdag', 'dinsdag', 'afspraak'],
              'Sorry, …'
            ),
            repair(
              'rp-l2-e2',
              'Busy staff',
              'You’ve been waiting; they said they’ll be with you soon.',
              'Een moment, ik ben zo bij u.',
              'One moment, I’ll be right with you.',
              'You’ve waited a while. Best reaction?',
              [
                'Prima, ik wacht even.',
                'Schiet op!',
                'Ik ga weg voor altijd.',
              ],
              0
            ),
          ],
          metadata: meta,
        },
        {
          index: 3,
          label: 'confident',
          title: 'Confident · Fast choice',
          summary: 'Pick under mild pressure.',
          premiumLocked: true,
          exercises: [
            mcq(
              'rp-l3-e1',
              'Quick',
              'You freeze — pick the smallest step forward.',
              'Choose.',
              ['Ehm… een ogenblik, alstublieft.', 'Ik weet niks.', 'Tot ziens nu.'],
              0
            ),
            repair(
              'rp-l3-e2',
              'Wrong number',
              'A stranger is on the line looking for someone else.',
              'U belt waarschijnlijk het verkeerde nummer.',
              'You’ve probably dialled the wrong number.',
              'What do you say?',
              [
                'Ik denk dat u het verkeerde nummer heeft.',
                'Waarom belt u mij?',
                'Ik spreek geen mensen.',
              ],
              0
            ),
          ],
          metadata: meta,
        },
      ],
    },
  ],
}

export const SKILL_TRACKS_CATALOG: SkillTrackCatalog = skillTrackCatalogSchema.parse(RAW_CATALOG)

export function listSkillTrackDefinitions(): SkillTrackDefinition[] {
  return SKILL_TRACKS_CATALOG.tracks
}

export function getSkillTrackDefinition(id: string): SkillTrackDefinition | undefined {
  return SKILL_TRACKS_CATALOG.tracks.find((t) => t.id === id)
}
