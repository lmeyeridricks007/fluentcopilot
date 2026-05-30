'use client'

import { Bot, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { GuidedChatMessage } from '@/lib/practice/guided/guidedSessionState'
import { clsx } from 'clsx'
import { CoachTypingIndicator } from '@/components/interaction/CoachTypingIndicator'
import { AssistantMessageListenButton } from '@/components/assistant-audio/AssistantMessageListenButton'

export function GuidedConversationThread({
  messages,
  assistantLastId,
  overlayByMsgId,
  suppressedAssistantId,
  enterAnimAssistantId,
  playbackThreadId,
}: {
  messages: GuidedChatMessage[]
  assistantLastId: string | null
  overlayByMsgId: Record<string, { keyPhraseGlossEn?: string; lineMeaningEn?: string }>
  /** While set, that assistant bubble is hidden and a typing row is shown instead. */
  suppressedAssistantId?: string | null
  /** One-shot entrance motion for this assistant message id. */
  enterAnimAssistantId?: string | null
  /** Scoped id for server TTS (e.g. `guided:<scenarioId>`). */
  playbackThreadId: string
}) {
  return (
    <div
      className="flex flex-col gap-3 px-1 py-2 min-h-0"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((msg, idx) => {
        if (msg.role === 'assistant' && suppressedAssistantId && msg.id === suppressedAssistantId) {
          return <CoachTypingIndicator key={`typing-${msg.id}`} />
        }
        const isLastAssistant = msg.role === 'assistant' && msg.id === assistantLastId
        const isUser = msg.role === 'user'
        const doEnter = msg.role === 'assistant' && enterAnimAssistantId === msg.id
        return (
          <div
            key={msg.id}
            className={clsx(
              'flex gap-2',
              isUser ? 'flex-row-reverse' : '',
              doEnter && 'motion-safe:animate-fc-message-in'
            )}
          >
            <div
              className={clsx(
                'w-9 h-9 rounded-full shrink-0 flex items-center justify-center',
                isUser ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-700'
              )}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={clsx('min-w-0 flex-1 max-w-[min(100%,20rem)]', isUser ? 'items-end flex flex-col' : '')}>
              <Card
                variant="flat"
                className={clsx(
                  'p-3 w-full',
                  isUser && 'bg-primary-100/90 text-ink-primary border border-primary-200/50',
                  !isUser &&
                    isLastAssistant &&
                    'bg-white border-2 border-primary-200/90 shadow-[0_4px_20px_-8px_rgba(109,40,217,0.2)]',
                  !isUser && !isLastAssistant && 'bg-slate-50/95 border border-slate-200/80'
                )}
              >
                {!isUser ? (
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary-800/75">
                      {idx > 0 && messages[idx - 1]?.role === 'user' ? 'Reply' : 'Partner'}
                    </span>
                    <AssistantMessageListenButton
                      messageId={msg.id}
                      text={msg.nl}
                      playbackThreadId={playbackThreadId}
                      compact
                    />
                  </div>
                ) : null}
                <p className={clsx('text-body-sm leading-relaxed', isLastAssistant && !isUser && 'font-medium')}>
                  {msg.nl}
                </p>
                {msg.role === 'assistant' && overlayByMsgId[msg.id]?.keyPhraseGlossEn ? (
                  <p className="text-caption text-ink-secondary mt-2 border-t border-slate-200/80 pt-2">
                    <span className="font-medium text-ink-primary">Key phrase · </span>
                    {overlayByMsgId[msg.id]!.keyPhraseGlossEn}
                  </p>
                ) : null}
                {msg.role === 'assistant' && overlayByMsgId[msg.id]?.lineMeaningEn ? (
                  <p className="text-caption text-ink-secondary mt-1">
                    <span className="font-medium text-ink-primary">In context · </span>
                    {overlayByMsgId[msg.id]!.lineMeaningEn}
                  </p>
                ) : null}
                {msg.role === 'user' && msg.en ? (
                  <p className="text-caption text-ink-secondary mt-1">{msg.en}</p>
                ) : null}
              </Card>
            </div>
          </div>
        )
      })}
    </div>
  )
}
