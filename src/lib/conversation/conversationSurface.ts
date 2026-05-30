/**
 * Distinguishes classic text threading from Speak Live (real-time voice).
 * Orthogonal to pacing (`guided` | `free` on `ConversationThread.mode`).
 * API / persistence field name: `conversationSurface`.
 */
export type ConversationSurface = 'text' | 'speak_live'
