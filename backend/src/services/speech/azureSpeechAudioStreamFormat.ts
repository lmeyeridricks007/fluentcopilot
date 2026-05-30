import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

/** Map browser / upload MIME types to Azure push-stream PCM/container formats (shared STT + pronunciation). */
export function azureStreamFormatForMime(mimeType: string): sdk.AudioStreamFormat {
  const m = mimeType.toLowerCase().replace(/\s+/g, '')
  if (m.includes('l16') || m.includes('pcm') || m.includes('linear16')) {
    const rateMatch = /rate[=:](\d+)/.exec(mimeType.toLowerCase())
    const hz = rateMatch ? Math.min(48000, Math.max(8000, parseInt(rateMatch[1], 10))) : 16000
    return sdk.AudioStreamFormat.getWaveFormatPCM(hz, 16, 1)
  }
  if (m.includes('ogg')) {
    return sdk.AudioStreamFormat.getWaveFormat(48000, 16, 1, sdk.AudioFormatTag.OGG_OPUS)
  }
  if (m.includes('webm')) {
    return sdk.AudioStreamFormat.getWaveFormat(48000, 16, 1, sdk.AudioFormatTag.WEBM_OPUS)
  }
  return sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
}
