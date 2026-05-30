'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { countWords } from '@/lib/exam-scoring/scoringGuards'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import { formatCountdownMmSs, useWritingSimulationTaskTimer } from '@/lib/exam-prep/writing/writingSimulationTimer'
import type { WritingExamDraftSnapshot } from '@/lib/exam-prep/writing/writingSimulationFlush'

export function WritingSimulationInputPanel({
  sessionKey,
  item,
  timerMode,
  durationSec,
  timerActive,
  onSubmit,
  onRemainingSeconds,
  examDraftRef,
  seedDraft,
  seedSessionKey,
  error,
  onDismissError,
}: {
  sessionKey: string
  item: WritingTrainingItem
  /** Global = one exam clock (parent); per_task = legacy countdown on this card. */
  timerMode: 'global' | 'per_task'
  durationSec?: number
  timerActive: boolean
  onSubmit: (payload: { bodyText: string; fieldValues?: Record<string, string>; timedOut: boolean }) => void
  onRemainingSeconds?: (sec: number) => void
  examDraftRef?: MutableRefObject<WritingExamDraftSnapshot>
  /** When `seedSessionKey === sessionKey`, hydrate fields from this snapshot once (autosave resume). */
  seedDraft?: WritingExamDraftSnapshot | null
  seedSessionKey?: string | null
  error: string | null
  onDismissError: () => void
}) {
  const [bodyText, setBodyText] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const expiredRef = useRef(false)
  const onSubmitRef = useRef(onSubmit)
  const draftRef = useRef({ bodyText: '', fields: {} as Record<string, string>, isForm: false })
  const onRemainingRef = useRef(onRemainingSeconds)

  useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])
  useEffect(() => {
    onRemainingRef.current = onRemainingSeconds
  }, [onRemainingSeconds])

  const isForm = (item.formFields?.length ?? 0) > 0

  useEffect(() => {
    draftRef.current = { bodyText, fields, isForm }
    if (examDraftRef) {
      examDraftRef.current = {
        bodyText,
        fieldValues: { ...fields },
        isForm,
      }
    }
  }, [bodyText, fields, isForm, examDraftRef])

  useEffect(() => {
    const useSeed = seedDraft && seedSessionKey === sessionKey
    if (useSeed && seedDraft) {
      if (seedDraft.isForm && seedDraft.fieldValues && Object.keys(seedDraft.fieldValues).length > 0) {
        setBodyText('')
        setFields({ ...seedDraft.fieldValues })
      } else {
        setBodyText(seedDraft.bodyText ?? '')
        const init: Record<string, string> = {}
        for (const f of item.formFields ?? []) {
          init[f.id] = ''
        }
        setFields(init)
      }
    } else {
      setBodyText('')
      const init: Record<string, string> = {}
      for (const f of item.formFields ?? []) {
        init[f.id] = ''
      }
      setFields(init)
    }
    expiredRef.current = false
  }, [sessionKey, item, seedDraft, seedSessionKey])

  const wc = useMemo(() => countWords(isForm ? Object.values(fields).join(' ') : bodyText), [isForm, fields, bodyText])

  const missingRequired = useMemo(() => {
    if (!isForm) return false
    for (const f of item.formFields ?? []) {
      if (f.required === false) continue
      if (!(fields[f.id]?.trim() ?? '')) return true
    }
    return false
  }, [isForm, item.formFields, fields])

  const canSubmitManual = isForm ? !missingRequired && wc >= 2 : bodyText.trim().length > 0 && wc >= 2

  const handleExpire = useCallback(() => {
    if (timerMode !== 'per_task') return
    if (expiredRef.current) return
    expiredRef.current = true
    const { bodyText: b, fields: fd, isForm: form } = draftRef.current
    if (form) {
      onSubmitRef.current({ bodyText: '', fieldValues: { ...fd }, timedOut: true })
    } else {
      onSubmitRef.current({ bodyText: b, fieldValues: undefined, timedOut: true })
    }
  }, [timerMode])

  const perTaskDuration = durationSec ?? 600
  const remaining = useWritingSimulationTaskTimer({
    active: timerMode === 'per_task' && timerActive,
    durationSec: perTaskDuration,
    onExpire: handleExpire,
  })

  useEffect(() => {
    if (timerMode === 'per_task') {
      onRemainingRef.current?.(remaining)
    }
  }, [remaining, timerMode])

  return (
    <Card variant="outlined" padding="md" className="border-slate-300 bg-white">
      <CardTitle className="text-body font-semibold text-ink-primary">Antwoord</CardTitle>
      {timerMode === 'per_task' ? (
        <>
          <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
            {isForm
              ? 'Vul het formulier in het Nederlands in. Loopt de tijd af, dan wordt ingeleverd wat u heeft staan.'
              : 'Schrijf uw tekst in het Nederlands. Loopt de tijd af, dan wordt uw huidige tekst ingeleverd.'}
          </p>
          <p className="mt-2 text-body-sm text-ink-secondary tabular-nums" aria-live="polite">
            Resterend (deze opdracht):{' '}
            <span className="font-semibold text-ink-primary">{formatCountdownMmSs(remaining)}</span>
          </p>
        </>
      ) : (
        <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
          Lever in wanneer u klaar bent. De totale examentijd loopt boven in beeld.
        </p>
      )}

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-body-sm text-rose-900 flex justify-between gap-2 items-start">
          <span>{error}</span>
          <button type="button" className="text-caption font-semibold underline shrink-0" onClick={onDismissError}>
            OK
          </button>
        </div>
      ) : null}

      {isForm ? (
        <div className="mt-4 space-y-3">
          {item.formFields?.map((f) => (
            <label key={f.id} className="block">
              <span className="text-body-sm font-medium text-ink-primary">{f.labelDutch}</span>
              <input
                type="text"
                autoComplete="off"
                value={fields[f.id] ?? ''}
                placeholder={f.placeholderDutch}
                onChange={(e) => {
                  setFields((prev) => ({ ...prev, [f.id]: e.target.value }))
                  onDismissError()
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body text-ink-primary min-h-touch focus:outline-none focus:ring-2 focus:ring-slate-400/40"
              />
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={bodyText}
          onChange={(e) => {
            setBodyText(e.target.value)
            onDismissError()
          }}
          rows={9}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-body text-ink-primary leading-relaxed min-h-[12rem] resize-y focus:outline-none focus:ring-2 focus:ring-slate-400/40"
          placeholder="Schrijf hier…"
          spellCheck
        />
      )}

      {timerMode === 'per_task' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-caption text-ink-tertiary">
          <span>
            Woorden: <span className="font-medium text-ink-secondary tabular-nums">{wc}</span>
            {!isForm && wc < 2 ? <span className="text-amber-800"> — minimaal 2 woorden om in te leveren</span> : null}
          </span>
        </div>
      ) : null}

      <Button
        type="button"
        className="mt-4 w-full min-h-touch gap-2"
        disabled={!canSubmitManual || expiredRef.current}
        onClick={() => {
          if (expiredRef.current) return
          if (isForm) {
            onSubmit({ bodyText: '', fieldValues: { ...fields }, timedOut: false })
          } else {
            onSubmit({ bodyText, fieldValues: undefined, timedOut: false })
          }
        }}
      >
        <SendHorizontal className="w-4 h-4" aria-hidden />
        Inleveren
      </Button>
    </Card>
  )
}
