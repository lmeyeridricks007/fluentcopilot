import { execFile } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

/**
 * Extract `[startSec, endSec]` from arbitrary learner audio into 16 kHz mono PCM WAV for Azure Speech.
 */
export async function extractAudioSegmentToWavPcm16kMono(
  audio: Buffer,
  mimeType: string,
  startSec: number,
  endSec: number
): Promise<Buffer> {
  const start = Math.max(0, startSec)
  const dur = Math.max(0.12, endSec - start)
  const id = randomUUID().slice(0, 8)
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? 'audio/webm'
  const ext = base.includes('webm') ? 'webm' : base.includes('wav') ? 'wav' : base.includes('mpeg') || base.includes('mp3') ? 'mp3' : 'webm'
  const inPath = join(tmpdir(), `ra-seg-in-${id}.${ext}`)
  const outPath = join(tmpdir(), `ra-seg-out-${id}.wav`)

  try {
    await writeFile(inPath, audio)
    await new Promise<void>((resolve, reject) => {
      execFile(
        'ffmpeg',
        [
          '-y',
          '-i',
          inPath,
          '-ss',
          String(start),
          '-t',
          String(dur),
          '-ar',
          '16000',
          '-ac',
          '1',
          '-sample_fmt',
          's16',
          '-f',
          'wav',
          outPath,
        ],
        { timeout: 120_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(new Error(stderr?.slice(0, 600) || err.message))
          } else {
            resolve()
          }
        }
      )
    })
    return await readFile(outPath)
  } finally {
    unlink(inPath).catch(() => {})
    unlink(outPath).catch(() => {})
  }
}
