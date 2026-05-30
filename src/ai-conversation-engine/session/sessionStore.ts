/**
 * AI Conversation Engine — in-memory session storage.
 * Replace with persistent store (e.g. Redis/DB) in production.
 */

import type { ConversationSession } from '../types/session.js'

const sessions = new Map<string, ConversationSession>()

export function getSession(sessionId: string): ConversationSession | null {
  return sessions.get(sessionId) ?? null
}

export function saveSession(session: ConversationSession): void {
  sessions.set(session.session_id, { ...session })
}

export function updateSession(
  sessionId: string,
  update: Partial<ConversationSession>
): ConversationSession | null {
  const existing = sessions.get(sessionId)
  if (!existing) return null
  const updated = { ...existing, ...update }
  sessions.set(sessionId, updated)
  return updated
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}

export function listSessionsByUser(userId: string): ConversationSession[] {
  return Array.from(sessions.values()).filter((s) => s.user_id === userId)
}
