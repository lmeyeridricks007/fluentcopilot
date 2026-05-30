'use client'

import { blobToBase64 } from '@/lib/speech/speechClient'

const PCM_OUT_MIME = 'audio/l16;rate=16000;channels=1'

/**
 * Binary → base64 without per-byte string concatenation (that pattern is O(n²) and freezes the tab on longer PCM).
 * Build fixed-size slices with `apply` (chunk small enough to stay under typical engine argument/stack limits).
 */
function uint8ToBase64(u8: Uint8Array): string {
  const SLICE = 8192
  const parts: string[] = []
  for (let i = 0; i < u8.length; i += SLICE) {
    const end = Math.min(i + SLICE, u8.length)
    const slice = u8.subarray(i, end)
    parts.push(String.fromCharCode.apply(null, slice as unknown as number[]))
  }
  return btoa(parts.join(''))
}

function toMonoBuffer(audioBuffer: AudioBuffer): AudioBuffer {
  if (audioBuffer.numberOfChannels === 1) return audioBuffer
  const ac = new AudioContext()
  try {
    const mono = ac.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate)
    const out = mono.getChannelData(0)
    for (let i = 0; i < audioBuffer.length; i++) {
      let s = 0
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        s += audioBuffer.getChannelData(c)[i]
      }
      out[i] = s / audioBuffer.numberOfChannels
    }
    return mono
  } finally {
    void ac.close()
  }
}

/**
 * Azure Speech SDK on Node (Functions) does not reliably decode WebM/Opus from MediaRecorder without
 * GStreamer. We decode in the browser and send 16 kHz mono s16le PCM, which the SDK accepts via
 * {@link sdk.AudioStreamFormat.getWaveFormatPCM}.
 */
export async function prepareAudioForAzurePronunciationAssessment(
  blob: Blob,
  sourceMime: string
): Promise<{ audioBase64: string; mimeType: string }> {
  const m = sourceMime.toLowerCase()
  if (m.includes('l16') || (m.includes('pcm') && m.includes('16000'))) {
    return { audioBase64: await blobToBase64(blob), mimeType: sourceMime }
  }

  const arrayBuf = await blob.arrayBuffer()
  if (arrayBuf.byteLength < 32) {
    throw new Error('Recording too short to assess.')
  }

  const decodeCtx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0))
  } catch (e) {
    await decodeCtx.close().catch(() => {})
    throw new Error(
      e instanceof Error
        ? `Could not decode recording for pronunciation scoring: ${e.message}. Try Chrome or Edge, or a shorter clip.`
        : 'Could not decode recording for pronunciation scoring.'
    )
  }
  await decodeCtx.close().catch(() => {})

  const mono = toMonoBuffer(decoded)
  const targetRate = 16000
  const OfflineCtor = (() => {
    if (typeof window === 'undefined') return OfflineAudioContext
    const w = window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }
    return w.webkitOfflineAudioContext ?? OfflineAudioContext
  })()
  const frames = Math.max(1, Math.ceil(mono.duration * targetRate))
  const offline = new OfflineCtor(1, frames, targetRate)
  const src = offline.createBufferSource()
  src.buffer = mono
  src.connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()
  const ch = rendered.getChannelData(0)
  if (ch.length === 0) {
    throw new Error('Decoded audio was empty — try recording again.')
  }
  const out = new Int16Array(ch.length)
  for (let i = 0; i < ch.length; i++) {
    const x = Math.max(-1, Math.min(1, ch[i]))
    out[i] = Math.round(x < 0 ? x * 0x8000 : x * 0x7fff)
  }
  return { audioBase64: uint8ToBase64(new Uint8Array(out.buffer, out.byteOffset, out.byteLength)), mimeType: PCM_OUT_MIME }
}

/** When true, send audio through {@link prepareAudioForAzurePronunciationAssessment} before `POST /speech/transcribe` (Azure STT on Node does not reliably ingest raw WebM/Opus). */
export function shouldPrepareWebmLikeForServerStt(mimeType: string): boolean {
  const m = mimeType.toLowerCase()
  if (m.includes('l16') || (m.includes('pcm') && m.includes('16000'))) return false
  return m.includes('webm') || m.includes('ogg') || m.includes('opus')
}
