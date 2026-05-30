'use client'

import { useEffect, useState } from 'react'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient, type QuickCaptureItem } from '@/lib/api/quickCaptureClient'

function parseInlineVoiceAudio(rawJson: string | null): { src: string } | null {
  if (!rawJson?.trim()) return null
  try {
    const j = JSON.parse(rawJson) as Record<string, unknown>
    const b64 = typeof j.voiceAudioBase64 === 'string' ? j.voiceAudioBase64 : ''
    const mime = typeof j.voiceMimeType === 'string' && j.voiceMimeType.trim() ? j.voiceMimeType.trim() : 'audio/webm'
    if (!b64 || b64.length < 48) return null
    return { src: `data:${mime};base64,${b64}` }
  } catch {
    return null
  }
}

function rawJsonHasBlobVoice(rawJson: string | null): boolean {
  if (!rawJson?.trim()) return false
  try {
    const j = JSON.parse(rawJson) as Record<string, unknown>
    return typeof j.voiceBlobPath === 'string' && j.voiceBlobPath.trim().length > 0
  } catch {
    return false
  }
}

export function VoiceNotePlayback({ item }: { item: QuickCaptureItem }) {
  const [src, setSrc] = useState<string | null>(() => parseInlineVoiceAudio(item.rawJson)?.src ?? null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const inline = parseInlineVoiceAudio(item.rawJson)
    if (inline) {
      setSrc(inline.src)
      setErr(null)
      setLoading(false)
      return
    }

    if (!rawJsonHasBlobVoice(item.rawJson)) {
      setSrc(null)
      setErr(null)
      setLoading(false)
      return
    }

    if (!isFeature1ChatBackendEnabled()) {
      setSrc(null)
      setErr('Recording is stored in the cloud after sync. Turn the API on, or open this capture where you saved it with the original file.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setErr(null)
    void (async () => {
      try {
        const r = await quickCaptureClient.getVoicePlaybackUrl(item.id)
        if (cancelled) return
        if ('url' in r && r.url) {
          setSrc(r.url)
          setErr(null)
        } else if ('error' in r) {
          setSrc(null)
          const key = r.error
          setErr(
            key === 'no_audio'
              ? 'No audio file is linked to this save (it may still be processing).'
              : key === 'unavailable'
                ? 'Playback is temporarily unavailable (storage not configured or file missing).'
                : 'Could not open this recording.',
          )
        } else {
          setErr('Could not open this recording.')
        }
      } catch {
        if (!cancelled) setErr('Could not load a playback link.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [item.id, item.rawJson])

  if (loading) {
    return <p className="text-caption text-ink-tertiary">Loading recording…</p>
  }

  if (err) {
    return <p className="text-caption text-amber-900/90 leading-relaxed">{err}</p>
  }

  if (!src) {
    return (
      <p className="text-caption text-ink-tertiary leading-relaxed">
        No playable audio is stored on this capture yet. If you just saved, wait a few seconds and refresh.
      </p>
    )
  }

  return <audio src={src} controls className="mt-1 h-10 w-full" preload="metadata" />
}
