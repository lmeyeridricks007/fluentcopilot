import { getContentSafetyConfig } from '../../config/env'
import type { ModerationProvider, ModerationResult } from './moderationTypes'

type AnalyzeResponse = {
  categoriesAnalysis?: { category: string; severity?: number }[]
}

const BLOCK_AT = 4

function mapResult(data: AnalyzeResponse): ModerationResult {
  const flagged: string[] = []
  let maxSev = 0
  for (const c of data.categoriesAnalysis ?? []) {
    const s = c.severity ?? 0
    if (s >= BLOCK_AT) flagged.push(c.category)
    maxSev = Math.max(maxSev, s)
  }
  if (maxSev >= BLOCK_AT) {
    return {
      severity: 'block',
      categoriesFlagged: flagged,
      replacementText: 'Sorry — that content can’t be processed. Please rephrase.',
    }
  }
  if (maxSev >= 2) {
    return { severity: 'warn', categoriesFlagged: flagged }
  }
  return { severity: 'safe', categoriesFlagged: [] }
}

async function callAnalyze(text: string): Promise<ModerationResult> {
  const { endpoint, apiKey, apiVersion } = getContentSafetyConfig()
  if (!endpoint || !apiKey) {
    return { severity: 'safe', categoriesFlagged: [] }
  }
  const url = `${endpoint}/contentsafety/text:analyze?api-version=${encodeURIComponent(apiVersion)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      text,
      categories: ['Hate', 'Sexual', 'SelfHarm', 'Violence'],
      outputType: 'FourSeverityLevels',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Content Safety HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as AnalyzeResponse
  return mapResult(data)
}

export class AzureContentSafetyProvider implements ModerationProvider {
  analyzeUserText(text: string): Promise<ModerationResult> {
    return callAnalyze(text)
  }
  analyzeAssistantText(text: string): Promise<ModerationResult> {
    return callAnalyze(text)
  }
}
