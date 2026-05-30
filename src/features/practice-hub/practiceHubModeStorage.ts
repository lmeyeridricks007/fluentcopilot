import type { PracticeHubMode } from './components/PracticeModeSwitcher'

const STORAGE_KEY = 'fc_practice_hub_mode_v1'

function isMode(v: string | null): v is PracticeHubMode {
  return v === 'do' || v === 'improve' || v === 'explore'
}

export function readPracticeHubMode(): PracticeHubMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isMode(raw) ? raw : null
  } catch {
    return null
  }
}

export function writePracticeHubMode(mode: PracticeHubMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // ignore quota / private mode
  }
}
