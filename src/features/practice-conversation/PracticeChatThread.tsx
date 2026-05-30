'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { Bot, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AssistantMessageListenButton } from '@/components/assistant-audio/AssistantMessageListenButton'
import { chatAudioManager } from '@/lib/audio/chatAudioManager'

export type PracticeThreadMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  translationEn?: string
  /** Key-phrase gloss (English) — support tool, not full-line dependency. */
  keyPhraseGlossEn?: string
  /** Short contextual meaning (English) — “what does that mean?” */
  lineMeaningEn?: string
}

/** Persona/scene picture rendered inside the assistant avatar circle. */
export type AssistantAvatar = {
  src: string
  alt: string
}

export function PracticeChatThread({
  messages,
  showTranslationForId,
  onToggleTranslation,
  playbackThreadId = 'open-practice',
  assistantAvatar = null,
}: {
  messages: PracticeThreadMessage[]
  showTranslationForId: string | null
  onToggleTranslation?: (id: string) => void
  /** Forwarded to server TTS (e.g. `open-practice:<scenarioId>`). */
  playbackThreadId?: string
  /** When provided, the assistant avatar shows this image (cropped to a circle) instead of the generic bot icon. */
  assistantAvatar?: AssistantAvatar | null
}) {
  useEffect(() => {
    for (const m of messages) {
      if (m.role === 'assistant' && m.content.trim()) {
        chatAudioManager.preload(m.id, m.content, undefined, playbackThreadId)
      }
    }
  }, [messages, playbackThreadId])

  return (
    <div className="space-y-3 pr-1">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          {msg.role === 'assistant' && assistantAvatar?.src ? (
            <div
              className="relative w-8 h-8 rounded-full shrink-0 overflow-hidden bg-slate-200 ring-1 ring-slate-300/60"
              role="img"
              aria-label={assistantAvatar.alt}
            >
              <Image
                src={assistantAvatar.src}
                alt={assistantAvatar.alt}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-ink-secondary'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
          )}
          <Card
            variant="flat"
            className={`max-w-[88%] p-3 ${
              msg.role === 'user' ? 'bg-primary-100 text-ink-primary' : 'bg-surface-muted'
            }`}
          >
            {msg.role === 'assistant' && msg.content.trim() ? (
              <div className="flex justify-end mb-1">
                <AssistantMessageListenButton
                  messageId={msg.id}
                  text={msg.content}
                  playbackThreadId={playbackThreadId}
                  compact
                />
              </div>
            ) : null}
            <p className="text-body-sm leading-relaxed">{msg.content}</p>
            {msg.role === 'assistant' && msg.keyPhraseGlossEn ? (
              <p className="text-caption text-ink-secondary mt-1 border-t border-slate-200/80 pt-1">
                <span className="font-medium text-ink-primary">Key phrase · </span>
                {msg.keyPhraseGlossEn}
              </p>
            ) : null}
            {msg.role === 'assistant' && msg.lineMeaningEn ? (
              <p className="text-caption text-ink-secondary mt-1 border-t border-slate-200/80 pt-1">
                <span className="font-medium text-ink-primary">In context · </span>
                {msg.lineMeaningEn}
              </p>
            ) : null}
            {msg.role === 'assistant' && msg.translationEn && showTranslationForId === msg.id ? (
              <p className="text-caption text-ink-secondary mt-1">{msg.translationEn}</p>
            ) : null}
            {msg.role === 'assistant' && msg.translationEn && onToggleTranslation ? (
              <button
                type="button"
                onClick={() => onToggleTranslation(msg.id)}
                className="text-caption font-medium text-primary-600 mt-1"
              >
                {showTranslationForId === msg.id ? 'Hide English' : 'Show coaching line'}
              </button>
            ) : null}
          </Card>
        </div>
      ))}
    </div>
  )
}
