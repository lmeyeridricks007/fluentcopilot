import { describe, expect, it } from 'vitest'
import {
  isRawLinearPcmMime,
  parsePcmSampleRateFromMime,
  wrapPcm16leMonoInWav,
} from './pcm16MonoToWav'

describe('pcm16MonoToWav', () => {
  it('detects browser L16 mime as raw PCM', () => {
    expect(isRawLinearPcmMime('audio/l16;rate=16000;channels=1')).toBe(true)
    expect(isRawLinearPcmMime('audio/wav')).toBe(false)
  })

  it('parses sample rate from mime', () => {
    expect(parsePcmSampleRateFromMime('audio/l16;rate=16000;channels=1')).toBe(16000)
    expect(parsePcmSampleRateFromMime('audio/l16;rate=48000')).toBe(48000)
    expect(parsePcmSampleRateFromMime('audio/l16')).toBe(16000)
  })

  it('prepends a valid PCM WAV header', () => {
    const pcm = Buffer.alloc(320, 0) // 160 samples of silence @16kHz mono s16le
    const wav = wrapPcm16leMonoInWav(pcm, 16000)
    expect(wav.length).toBe(44 + pcm.length)
    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE')
    expect(wav.subarray(12, 16).toString('ascii')).toBe('fmt ')
    expect(wav.readUInt16LE(20)).toBe(1) // PCM
    expect(wav.readUInt16LE(22)).toBe(1) // mono
    expect(wav.readUInt32LE(24)).toBe(16000)
    expect(wav.subarray(36, 40).toString('ascii')).toBe('data')
    expect(wav.readUInt32LE(40)).toBe(pcm.length)
    expect(wav.subarray(44)).toEqual(pcm)
  })
})
