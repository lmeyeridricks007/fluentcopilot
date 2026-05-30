/**
 * Demo lines for Web Speech only — this screen does not call the real LLM yet.
 * Order is intentionally not “platform first” so local testing does not feel broken
 * when practising delay / punctuality phrases before platform questions.
 */
const TRAIN = [
  'Goedemiddag, waarmee kan ik u helpen?',
  'Voor op tijd en vertraging: volgens de planning rijdt deze trein nu op tijd; kijk voor de zekerheid op het perronscherm.',
  'Voor het perron: meestal spoor vier, maar het scherm boven de trap is leidend.',
  'Er is soms een paar minuten vertraging richting Amsterdam; check het actuele vertrek op het scherm.',
  'Wilt u overstappen in Utrecht?',
  'Dank u wel, prettige reis.',
]

const CAFE = [
  'Goedendag, wat mag het zijn?',
  'Een koffie verkeerd, prima.',
  'Wilt u daar melk bij?',
  'Dat is vier euro vijftig, alstublieft.',
  'Eet smakelijk.',
]

const DEFAULT = [
  'Hallo, ik luister.',
  'Dank je, een moment.',
  'Kun je dat herhalen?',
  'Goed zo, ga verder.',
]

export function pickAiLine(scenarioId: string, turnIndex: number): string {
  const id = scenarioId.toLowerCase()
  const pool = id.includes('cafe') ? CAFE : id.includes('train') ? TRAIN : DEFAULT
  return pool[turnIndex % pool.length] ?? pool[0]
}
