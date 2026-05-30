'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, Gauge } from 'lucide-react'
import type { LiveSpeechLatencyTrace } from './liveSpeechLatencyTrace'
import type { TurnTimelineSnapshot, TurnTimelineFlag } from './turnTimeline'

function fmtMs(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n)} ms`
}

function deltaMs(a?: number | null, b?: number | null): string {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return '—'
  return `${Math.max(0, Math.round(b - a))} ms`
}

export function findTranscriptConfidenceLabel(obj: unknown): string | null {
  if (obj == null) return null
  if (typeof obj === 'number' && obj >= 0 && obj <= 1) return `${Math.round(obj * 100)}%`
  if (typeof obj === 'number' && Number.isFinite(obj)) return String(obj)
  if (typeof obj === 'string' && obj.trim()) return obj.trim().slice(0, 96)
  if (typeof obj !== 'object') return null
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const r = findTranscriptConfidenceLabel(x)
      if (r) return r
    }
    return null
  }
  const o = obj as Record<string, unknown>
  for (const k of Object.keys(o)) {
    if (/confidence|Confidence|lexical|accuracy|nBest/i.test(k)) {
      const v = o[k]
      if (typeof v === 'number' || typeof v === 'string') {
        const r = findTranscriptConfidenceLabel(v)
        if (r) return r
      } else {
        const r = findTranscriptConfidenceLabel(v)
        if (r) return r
      }
    }
  }
  for (const k of Object.keys(o)) {
    const r = findTranscriptConfidenceLabel(o[k])
    if (r) return r
  }
  return null
}

type Row = { label: string; value: string; highlight?: boolean }
type Section = { title: string; rows: Row[] }

function buildTimelineSections(tl: TurnTimelineSnapshot): Section[] {
  const d = tl.derived
  const blob = tl.audioBlobInfo

  const capture: Row[] = [
    { label: 'Mic → speech detected', value: fmtMs(d.speechStartDelay) },
    { label: 'Speech → first partial', value: fmtMs(d.partialTranscriptLatency) },
  ]

  const commit: Row[] = [
    { label: 'Silence → commit', value: fmtMs(d.silenceToCommit), highlight: (d.silenceToCommit ?? 0) > 1200 },
    { label: 'Commit → transcript ready', value: fmtMs(d.commitToTranscriptReady) },
  ]
  if (blob) {
    commit.push(
      { label: 'Audio blob size', value: `${(blob.sizeBytes / 1024).toFixed(1)} KB` },
      { label: 'Audio encode', value: fmtMs(blob.encodeMs), highlight: blob.encodeMs > 1000 },
      { label: 'Audio upload (server STT)', value: fmtMs(blob.uploadMs), highlight: blob.uploadMs > 1000 },
    )
  }

  const network: Row[] = [
    { label: 'Transcript → request sent', value: fmtMs(d.transcriptReadyToRequestSent) },
    { label: 'Request → first byte', value: fmtMs(d.requestSentToFirstByte) },
    { label: 'First byte → first text', value: fmtMs(d.firstByteToFirstText) },
  ]

  const playback: Row[] = [
    { label: 'First text → TTS chunk ready', value: fmtMs(d.firstTextToFirstTtsChunk) },
    { label: 'TTS ready → playback started', value: fmtMs(d.firstTtsChunkToPlayback), highlight: (d.firstTtsChunkToPlayback ?? 0) > 800 },
    { label: 'Commit → playback', value: fmtMs(d.commitToPlayback), highlight: (d.commitToPlayback ?? 0) > 2500 },
    { label: 'TOTAL (mic → playback)', value: fmtMs(d.totalTurnLatency), highlight: (d.totalTurnLatency ?? 0) > 5000 },
  ]

  return [
    { title: '🎤 Capture', rows: capture },
    { title: '⏱ Commit', rows: commit },
    { title: '🌐 Network', rows: network },
    { title: '🔊 Playback', rows: playback },
  ]
}

function buildLegacySections(trace: LiveSpeechLatencyTrace, turnDebug: Record<string, unknown> | null): Section[] {
  const tp = trace.firstPartialTranscriptMs
  const tf = trace.finalTranscriptMs
  const confidence = findTranscriptConfidenceLabel(turnDebug)

  const server: Row[] = [
    { label: 'Server model', value: trace.serverModelUsed?.trim() || '—' },
    { label: 'Server LLM ms', value: fmtMs(trace.serverLlmMs) },
    { label: 'Server 1st token ms', value: fmtMs(trace.serverFirstTokenMs) },
    { label: 'Server state load ms', value: fmtMs(trace.serverStateLoadMs) },
    { label: 'Server norm ms', value: fmtMs(trace.serverNormalizationMs) },
    { label: 'Server total ms', value: fmtMs(trace.serverTotalMs) },
    { label: 'Server bottleneck', value: trace.serverBottleneckStage ?? '—' },
    {
      label: 'Token est. (in / out)',
      value:
        trace.serverEstimatedInputTokens != null && trace.serverEstimatedOutputTokens != null
          ? `${trace.serverEstimatedInputTokens} / ${trace.serverEstimatedOutputTokens}`
          : trace.estimatedPromptTokens != null
            ? `~${trace.estimatedPromptTokens} in`
            : '—',
    },
    {
      label: 'Budgets exceeded',
      value: trace.serverBudgetsExceeded?.length ? trace.serverBudgetsExceeded.join(', ') : '—',
    },
  ]

  const client: Row[] = [
    { label: 'Partial → final', value: deltaMs(tp, tf) },
    { label: 'LLM first delta ms', value: fmtMs(trace.llmFirstDeltaMs) },
    { label: 'LLM total ms', value: fmtMs(trace.llmMs) },
    { label: 'TTS ms', value: fmtMs(trace.ttsMs) },
    { label: 'Playback start ms', value: fmtMs(trace.playbackStartMs) },
    { label: 'Total ms', value: fmtMs(trace.totalMs), highlight: (trace.totalMs ?? 0) > 5000 },
    { label: 'Bottleneck', value: trace.bottleneck ?? '—' },
    { label: 'LLM → text render', value: fmtMs(trace.llmToTextRenderMs) },
    { label: 'Text → audio ready', value: fmtMs(trace.textToAudioReadyMs) },
    { label: 'Prompt chars', value: trace.promptChars != null ? String(trace.promptChars) : '—' },
    { label: 'Est. prompt tokens', value: trace.estimatedPromptTokens != null ? String(trace.estimatedPromptTokens) : '—' },
    { label: 'Response text len', value: trace.responseTextLength != null ? String(trace.responseTextLength) : '—' },
    { label: 'Auto-commit ms', value: fmtMs(trace.autoCommitMs) },
    { label: 'First TTS chunk ms', value: fmtMs(trace.firstTtsChunkReadyMs) },
    { label: 'TTS chunks', value: trace.ttsChunkCount != null ? String(trace.ttsChunkCount) : '—' },
    { label: 'Chunked TTS', value: trace.usedChunkedTts != null ? (trace.usedChunkedTts ? 'yes' : 'no') : '—' },
    { label: 'Fast turn', value: trace.usedFastTurn != null ? (trace.usedFastTurn ? 'yes' : 'no') : '—' },
    { label: 'Confidence', value: confidence ?? '—' },
  ]

  return [
    { title: '📡 Server', rows: server },
    { title: '📱 Client (legacy trace)', rows: client },
  ]
}

function FlagBadge({ flag }: { flag: TurnTimelineFlag }) {
  return (
    <span
      className={clsx(
        'inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase',
        flag.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800',
      )}
    >
      {flag.label} ({Math.round(flag.ms)}ms)
    </span>
  )
}

export function LiveSpeechPerfOverlay({
  trace,
  serverStreamPerf,
  turnDebug,
  timeline,
}: {
  trace: LiveSpeechLatencyTrace | null
  serverStreamPerf: Record<string, number> | null
  turnDebug: Record<string, unknown> | null
  timeline: TurnTimelineSnapshot | null
}) {
  const [open, setOpen] = useState(false)

  if (process.env.NODE_ENV === 'production') return null

  const timelineSections = timeline ? buildTimelineSections(timeline) : []
  const legacySections = trace ? buildLegacySections(trace, turnDebug) : []
  const allSections = [...timelineSections, ...legacySections]
  const flags = timeline?.flags ?? []

  const serverEntries = serverStreamPerf
    ? Object.entries(serverStreamPerf).filter(([k]) => k.startsWith('d_') || k === 'tTotalMs')
    : []

  const largestGap = timeline?.deltas.reduce(
    (best, d) => (d.ms > best.ms ? d : best),
    { from: '', to: '', ms: 0 },
  )

  return (
    <div
      className="pointer-events-auto fixed bottom-[6.25rem] left-2 z-[65] font-sans"
      aria-label="Developer performance trace (dev only)"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-bold shadow-md backdrop-blur-md transition-opacity',
          open
            ? 'border-violet-300 bg-violet-50 text-violet-900 opacity-100'
            : 'border-[#E5E7EB] bg-white/90 text-[#64748B] opacity-50 hover:opacity-100',
        )}
        title="Performance (development)"
      >
        <Gauge className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">Toggle performance overlay</span>
      </button>
      {open ? (
        <div className="absolute bottom-11 left-0 w-[min(22rem,calc(100vw-1rem))] max-h-[65vh] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white/98 p-3 text-[11px] text-[#0F172A] shadow-lg backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#E5E7EB] pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Live perf (dev)</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-[#64748B] hover:bg-slate-100">
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {!timeline && !trace ? (
            <p className="text-[12px] leading-snug text-[#475569]">Complete a voice turn to populate the trace.</p>
          ) : (
            <>
              {flags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {flags.map((f) => (
                    <FlagBadge key={f.id} flag={f} />
                  ))}
                </div>
              )}

              {largestGap && largestGap.ms > 200 && (
                <div className="mb-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] text-red-800">
                  <span className="font-bold">Largest gap:</span> {largestGap.from} → {largestGap.to} ={' '}
                  {Math.round(largestGap.ms)}ms
                </div>
              )}

              {allSections.map((section) => (
                <div key={section.title} className="mb-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">{section.title}</p>
                  <ul className="space-y-0.5">
                    {section.rows.map((r) => (
                      <li
                        key={r.label}
                        className={clsx(
                          'flex justify-between gap-3 leading-snug',
                          r.highlight && '-mx-1 rounded bg-amber-50 px-1',
                        )}
                      >
                        <span className="shrink-0 text-[#64748B]">{r.label}</span>
                        <span
                          className={clsx(
                            'min-w-0 break-words text-right font-medium tabular-nums',
                            r.highlight ? 'font-bold text-red-700' : 'text-violet-800',
                          )}
                        >
                          {r.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {timeline && timeline.deltas.length > 0 && (
                <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Event sequence</p>
                  <ul className="space-y-0.5">
                    {timeline.deltas.map((d, i) => (
                      <li
                        key={i}
                        className={clsx(
                          'flex justify-between gap-2 text-[10px] leading-tight',
                          d.ms === (largestGap?.ms ?? 0) && d.ms > 200 && '-mx-1 rounded bg-red-50 px-1 font-bold text-red-800',
                        )}
                      >
                        <span className="truncate text-[#64748B]">
                          {d.from} → {d.to}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#475569]">{Math.round(d.ms)} ms</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {serverEntries.length > 0 ? (
                <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Server done.perf</p>
                  <ul className="space-y-0.5">
                    {serverEntries.map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-2 text-[10px] leading-tight">
                        <span className="truncate text-[#64748B]">{k}</span>
                        <span className="shrink-0 tabular-nums text-[#475569]">{Math.round(v)} ms</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
