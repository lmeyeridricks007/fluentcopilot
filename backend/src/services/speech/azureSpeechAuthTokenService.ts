import { ApiError } from '../../shared/errors'
import { getAzureSpeechKey, getAzureSpeechRegion, isAzurePronunciationConfigured } from './pronunciationAssessmentConfig'

/**
 * Short-lived token for browser Azure Speech SDK (STT/TTS from client).
 * @see https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#authentication
 */
export async function issueAzureSpeechAuthorizationToken(): Promise<{
  token: string
  region: string
  expiresInSeconds: number
}> {
  if (!isAzurePronunciationConfigured()) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Azure Speech key/region are not configured.')
  }
  const key = getAzureSpeechKey()!
  const region = getAzureSpeechRegion()!

  const url = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Length': '0',
    },
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new ApiError(502, 'DEPENDENCY_UNAVAILABLE', `Could not issue Azure Speech token (${res.status})`, {
      detail: t.slice(0, 200),
    })
  }
  const token = (await res.text()).trim()
  if (!token) {
    throw new ApiError(502, 'DEPENDENCY_UNAVAILABLE', 'Empty token from Azure Speech')
  }
  /** Tokens are typically valid ~10 minutes; keep client refresh conservative. */
  return { token, region, expiresInSeconds: 540 }
}
