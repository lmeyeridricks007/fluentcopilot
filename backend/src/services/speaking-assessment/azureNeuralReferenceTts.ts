import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { getAzureSpeechKey, getAzureSpeechRegion } from '../speech/pronunciationAssessmentConfig'
import type { SpeechWordBoundary } from '../audio/textToSpeechContracts'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function xmlLangFromVoice(voice: string): string {
  const m = /^([a-z]{2})-([A-Z]{2})/i.exec(voice)
  return m ? `${m[1]!.toLowerCase()}-${m[2]!.toUpperCase()}` : 'nl-NL'
}

/** Azure SSML: combine rate / volume / pitch on one `<prosody>` when any are set. */
function wrapProsody(inner: string, opts: { rate?: string; volume?: string; pitch?: string }): string {
  const attrs: string[] = []
  if (opts.rate) attrs.push(`rate="${escapeXml(opts.rate)}"`)
  if (opts.volume) attrs.push(`volume="${escapeXml(opts.volume)}"`)
  if (opts.pitch) attrs.push(`pitch="${escapeXml(opts.pitch)}"`)
  if (attrs.length === 0) return inner
  return `<prosody ${attrs.join(' ')}>${inner}</prosody>`
}

function hasAnyProsody(opts: { rate?: string; volume?: string; pitch?: string }): boolean {
  return Boolean(opts.rate || opts.volume || opts.pitch)
}

function wrapMsttsExpressAs(inner: string, role: string): string {
  const r = role.trim()
  if (!r) return inner
  return `<mstts:express-as role="${escapeXml(r)}">${inner}</mstts:express-as>`
}

function speakRootOpen(lang: string, includeMsttsNs: boolean): string {
  return includeMsttsNs
    ? `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">`
    : `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">`
}

/**
 * Azure Neural TTS → MP3 buffer (in-memory). Requires AZURE_SPEECH_KEY + AZURE_SPEECH_REGION.
 */
export async function synthesizeAzureReferenceMp3(input: {
  ssml: string
}): Promise<{ audio: Buffer; wordBoundaries: SpeechWordBoundary[] }> {
  const key = getAzureSpeechKey()
  const region = getAzureSpeechRegion()
  if (!key || !region) {
    throw new Error('Azure Speech credentials missing')
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3

  const chunks: Buffer[] = []
  const wordBoundaries: SpeechWordBoundary[] = []
  class CollectCallback extends sdk.PushAudioOutputStreamCallback {
    write(buf: ArrayBuffer): void {
      chunks.push(Buffer.from(buf))
    }
    close(): void {
      /* stream end */
    }
  }
  const stream = sdk.PushAudioOutputStream.create(new CollectCallback())
  const audioConfig = sdk.AudioConfig.fromStreamOutput(stream)
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
  synthesizer.wordBoundary = (_sender, event) => {
    const text = (event.text ?? '').trim()
    if (!text) return
    wordBoundaries.push({
      text,
      textOffset: event.textOffset,
      wordLength: event.wordLength,
      audioOffsetMs: Math.round(event.audioOffset / 10_000),
      durationMs: Math.round(event.duration / 10_000),
    })
  }

  return new Promise((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      input.ssml,
      (result) => {
        synthesizer.close()
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const fromCb = Buffer.concat(chunks)
          if (fromCb.length > 0) {
            resolve({ audio: fromCb, wordBoundaries })
            return
          }
          if (result.audioData && result.audioData.byteLength > 0) {
            resolve({ audio: Buffer.from(result.audioData), wordBoundaries })
            return
          }
          reject(new Error('Azure TTS returned no audio bytes'))
        } else {
          reject(new Error(result.errorDetails || `Azure TTS failed: ${result.reason}`))
        }
      },
      (err) => {
        synthesizer.close()
        reject(new Error(typeof err === 'string' ? err : 'Azure TTS error'))
      }
    )
  })
}

export function buildReferenceSsml(input: {
  text: string
  voice: string
  /** e.g. -18% for slower reference */
  prosodyRate?: string
  /** e.g. `soft`, `medium`, or relative like `-4dB` */
  prosodyVolume?: string
  /** e.g. `-1st` for slightly lower pitch */
  prosodyPitch?: string
  /** Azure speaking role (e.g. `YoungAdultFemale`) — see Speech SSML `mstts:express-as`. Omit or disable via env when unsupported. */
  msttsExpressAsRole?: string | null
  /** Ordered chunks with breaks between (chunked mode). */
  chunks?: string[]
  /** Milliseconds between chunks when `chunks` set. */
  breakMs?: number
}): string {
  const lang = xmlLangFromVoice(input.voice)
  const voice = escapeXml(input.voice)
  const breakMs = input.breakMs ?? 420
  const prosodyOpts = {
    rate: input.prosodyRate,
    volume: input.prosodyVolume,
    pitch: input.prosodyPitch,
  }
  const role = input.msttsExpressAsRole?.trim() ?? ''
  const useRole = Boolean(role)
  const voiceBody = (core: string) =>
    `${speakRootOpen(lang, useRole)}<voice name="${voice}">${wrapMsttsExpressAs(core, role)}</voice></speak>`

  if (input.chunks && input.chunks.length > 0) {
    const inner = input.chunks
      .map((c) => escapeXml(c.trim()))
      .join(`<break time="${breakMs}ms"/>`)
    const wrapped = hasAnyProsody(prosodyOpts) ? wrapProsody(inner, prosodyOpts) : inner
    return voiceBody(wrapped)
  }

  const body = escapeXml(input.text.trim())
  if (hasAnyProsody(prosodyOpts)) {
    return voiceBody(wrapProsody(body, prosodyOpts))
  }
  return voiceBody(body)
}
