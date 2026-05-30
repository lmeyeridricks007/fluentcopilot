import { APP_SPEAK_LIVE_RUN } from '@/lib/routing/appRoutes'

const STORAGE_KEY = 'fc-speak-live-last-launch-v1'

export type SpeakLiveLastLaunch = {
  href: string
  savedAt: string
  scenarioTitle: string
  level: string
  /** Launcher catalog id when known (mirrors Speak Live selector tile). */
  launcherItemId?: string
}

function isSafeInternalRunHref(href: string): boolean {
  if (!href.startsWith(APP_SPEAK_LIVE_RUN)) return false
  try {
    const u = new URL(href, 'http://local.invalid')
    return u.pathname === APP_SPEAK_LIVE_RUN
  } catch {
    return false
  }
}

export function readSpeakLiveLastLaunch(): SpeakLiveLastLaunch | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Record<string, unknown>
    if (
      typeof o.href === 'string' &&
      typeof o.savedAt === 'string' &&
      typeof o.scenarioTitle === 'string' &&
      typeof o.level === 'string' &&
      isSafeInternalRunHref(o.href)
    ) {
      return {
        href: o.href,
        savedAt: o.savedAt,
        scenarioTitle: o.scenarioTitle,
        level: o.level,
        ...(typeof o.launcherItemId === 'string' ? { launcherItemId: o.launcherItemId } : {}),
      }
    }
    return null
  } catch {
    return null
  }
}

export function writeSpeakLiveLastLaunch(payload: SpeakLiveLastLaunch): void {
  if (typeof window === 'undefined') return
  if (!isSafeInternalRunHref(payload.href)) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
