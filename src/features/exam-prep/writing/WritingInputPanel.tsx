'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { countWords } from '@/lib/exam-scoring/scoringGuards'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import {
  AUTOSAVE_DEBOUNCE_TEXT_MS,
  AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS,
  parseWritingTrainingTextDraft,
  readAutosaveBody,
  trackAutosaveRestored,
  writeAutosaveDraft,
  writingTrainingTaskDraftKey,
} from '@/lib/autosave'

function nonWhitespaceLen(bodyText: string, fields: Record<string, string>): number {
  return bodyText.replace(/\s/g, '').length + Object.values(fields).join('').replace(/\s/g, '').length
}

export function WritingInputPanel({
  sessionKey,
  item,
  userId,
  onSubmit,
  error,
  onDismissError,
}: {
  sessionKey: string
  item: WritingTrainingItem
  /** When set, long-form draft is debounced to `lt.v1.drafts.<userId>`. */
  userId?: string
  onSubmit: (payload: { bodyText: string; fieldValues?: Record<string, string> }) => void
  error: string | null
  onDismissError: () => void
}) {
  const [bodyText, setBodyText] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [draftSavedHint, setDraftSavedHint] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    const init: Record<string, string> = {}
    for (const f of item.formFields ?? []) {
      init[f.id] = ''
    }
    let restored = false
    if (userId) {
      const key = writingTrainingTaskDraftKey(item.id)
      const raw = readAutosaveBody(userId, key)
      const d = parseWritingTrainingTextDraft(raw)
      if (d?.taskId === item.id) {
        const isForm = (item.formFields?.length ?? 0) > 0
        if (isForm && d.fieldValues && Object.keys(d.fieldValues).length > 0) {
          setBodyText('')
          setFields({ ...init, ...d.fieldValues })
        } else {
          setBodyText(d.bodyText ?? '')
          setFields(init)
        }
        restored = true
        trackAutosaveRestored('writing', item.id)
      }
    }
    if (!restored) {
      setBodyText('')
      setFields(init)
    }
    setDraftSavedHint(false)
  }, [sessionKey, item, userId])

  useEffect(() => {
    if (!userId) return
    const key = writingTrainingTaskDraftKey(item.id)
    const len = nonWhitespaceLen(bodyText, fields)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (len < AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS) return

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      if (nonWhitespaceLen(bodyText, fields) < AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS) return
      const payload = { v: 1 as const, taskId: item.id, bodyText, fieldValues: { ...fields } }
      writeAutosaveDraft(userId, key, 'writing', item.id, payload, { save_mode: 'debounced' })
      setDraftSavedHint(true)
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = setTimeout(() => setDraftSavedHint(false), 2800)
    }, AUTOSAVE_DEBOUNCE_TEXT_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [userId, item.id, bodyText, fields])

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    }
  }, [])

  const isForm = (item.formFields?.length ?? 0) > 0
  const wc = useMemo(() => countWords(isForm ? Object.values(fields).join(' ') : bodyText), [isForm, fields, bodyText])

  const missingRequired = useMemo(() => {
    if (!isForm) return false
    for (const f of item.formFields ?? []) {
      if (f.required === false) continue
      if (!(fields[f.id]?.trim() ?? '')) return true
    }
    return false
  }, [isForm, item.formFields, fields])

  const canSubmit = isForm ? !missingRequired && wc >= 2 : bodyText.trim().length > 0 && wc >= 2

  return (
    <Card variant="outlined" padding="md" className="border-slate-200">
      <CardTitle className="text-body font-semibold text-ink-primary">Uw tekst</CardTitle>
      <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
        {isForm
          ? 'Vul de velden in het Nederlands. De puntenlijst hierboven blijft zichtbaar terwijl u schrijft.'
          : 'Schrijf rustig in het Nederlands. Houd de puntenlijst in de gaten.'}
      </p>

      {draftSavedHint && userId ? (
        <p className="mt-2 text-caption text-ink-tertiary" aria-live="polite">
          Concept lokaal opgeslagen — u kunt veilig verder schrijven.
        </p>
      ) : null}

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
                onBlur={() => {
                  if (!userId) return
                  const len = nonWhitespaceLen(bodyText, fields)
                  if (len < AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS) return
                  const key = writingTrainingTaskDraftKey(item.id)
                  const payload = { v: 1 as const, taskId: item.id, bodyText, fieldValues: { ...fields } }
                  writeAutosaveDraft(userId, key, 'writing', item.id, payload, { save_mode: 'flush' })
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body text-ink-primary min-h-touch focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
          onBlur={() => {
            if (!userId) return
            const len = nonWhitespaceLen(bodyText, fields)
            if (len < AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS) return
            const key = writingTrainingTaskDraftKey(item.id)
            const payload = { v: 1 as const, taskId: item.id, bodyText, fieldValues: { ...fields } }
            writeAutosaveDraft(userId, key, 'writing', item.id, payload, { save_mode: 'flush' })
          }}
          rows={8}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-body text-ink-primary leading-relaxed min-h-[11rem] resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          placeholder="Schrijf hier uw antwoord in het Nederlands…"
          spellCheck
        />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-caption text-ink-tertiary">
        <span>
          Woorden: <span className="font-medium text-ink-secondary tabular-nums">{wc}</span>
          {wc < 2 ? <span className="text-amber-800"> — minimaal 2 woorden nodig</span> : null}
        </span>
      </div>

      <Button
        type="button"
        className="mt-4 w-full min-h-touch gap-2"
        disabled={!canSubmit}
        onClick={() => {
          if (isForm) {
            onSubmit({ bodyText: '', fieldValues: { ...fields } })
          } else {
            onSubmit({ bodyText, fieldValues: undefined })
          }
        }}
      >
        <SendHorizontal className="w-4 h-4" aria-hidden />
        Inleveren voor beoordeling
      </Button>
    </Card>
  )
}
