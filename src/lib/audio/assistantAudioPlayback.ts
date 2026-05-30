'use client'

/**
 * Facade for assistant message audio — delegates to the singleton {@link chatAudioManager}.
 * Prefer this module in new code for naming aligned with product architecture (single player, preload, OpenAI-first).
 */
import {
  chatAudioManager,
  getAssistantMessageAudioState,
  useChatAudioPlaybackSnapshot,
} from '@/lib/audio/chatAudioManager'

export type AssistantPlaybackOpts = {
  audioUrl?: string
  slow?: boolean
  threadId?: string
}

export const assistantAudioPlayback = {
  playMessageAudio(
    messageId: string,
    text: string,
    language = 'nl-NL',
    _voicePreference?: string,
    opts?: AssistantPlaybackOpts
  ) {
    void language
    void _voicePreference
    return chatAudioManager.playOrToggle(messageId, text, opts?.audioUrl, {
      slow: opts?.slow,
      threadId: opts?.threadId,
    })
  },

  pause: () => chatAudioManager.pause(),
  resume: () => chatAudioManager.resume(),
  stop: () => chatAudioManager.stop(),

  preloadMessageAudio(
    messageId: string,
    text: string,
    language = 'nl-NL',
    _voicePreference?: string,
    opts?: Pick<AssistantPlaybackOpts, 'audioUrl' | 'threadId'>
  ) {
    void language
    void _voicePreference
    chatAudioManager.preload(messageId, text, opts?.audioUrl, opts?.threadId)
  },

  getPlaybackState(messageId: string) {
    return getAssistantMessageAudioState(messageId)
  },

  /** React hook — same snapshot as `chatAudioManager` subscribers. */
  useSnapshot: useChatAudioPlaybackSnapshot,
}
