/**
 * Builds the Dutch line read aloud in speaking prep: scenario setup plus explicit task,
 * so learners never only hear a vague situation without the assignment (e.g. “Wat zeg je?”).
 */
export function speakingPrepAudioLine(scenarioNl: string | undefined, promptNl: string): string {
  const scenario = scenarioNl?.trim() ?? ''
  const prompt = promptNl.trim()
  if (!scenario) return prompt
  if (!prompt) return scenario
  const a = scenario.replace(/\s+/g, ' ').toLowerCase()
  const b = prompt.replace(/\s+/g, ' ').toLowerCase()
  if (b.includes(a) || a.includes(b)) {
    return prompt.length >= scenario.length ? prompt : scenario
  }
  return `${scenario}\n\n${prompt}`
}
