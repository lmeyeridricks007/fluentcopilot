/** Browser / prepare step sends s16le mono PCM; Whisper expects a container (e.g. WAV). */
export function isRawLinearPcmMime(mimeType: string): boolean {
  const m = mimeType.toLowerCase()
  if (m.includes('wav')) return false
  return m.includes('l16') || m.includes('linear16')
}

export function parsePcmSampleRateFromMime(mimeType: string): number {
  const rateMatch = /rate[=:](\d+)/i.exec(mimeType)
  if (rateMatch) {
    const hz = parseInt(rateMatch[1], 10)
    if (Number.isFinite(hz)) return Math.min(48_000, Math.max(8000, hz))
  }
  return 16_000
}

/** Standard 44-byte PCM WAV header + interleaved s16le mono payload (little-endian). */
export function wrapPcm16leMonoInWav(pcmS16le: Buffer, sampleRateHz: number): Buffer {
  const numChannels = 1
  const bitsPerSample = 16
  const blockAlign = (numChannels * bitsPerSample) / 8
  const byteRate = sampleRateHz * blockAlign
  const dataSize = pcmS16le.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRateHz, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcmS16le])
}
