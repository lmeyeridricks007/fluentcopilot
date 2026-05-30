/**
 * Client-side gate for Speak Live developer debug UI.
 * Must stay off in production builds (`NODE_ENV === 'production'`).
 *
 * Enable explicitly: `NEXT_PUBLIC_SPEAK_LIVE_DEBUG_PANEL=1` in `.env.local`
 * (mirrors server `SPEAK_LIVE_DEBUG_PANEL` / `SPEAK_LIVE_DEBUG_TURNS` for payloads).
 */
export function isSpeakLiveDebugPanelVisible(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  const flag = process.env.NEXT_PUBLIC_SPEAK_LIVE_DEBUG_PANEL
  return process.env.NODE_ENV === 'development' || flag === '1' || flag === 'true'
}

export const SPEAK_LIVE_DEBUG_PANEL_FLAG = 'NEXT_PUBLIC_SPEAK_LIVE_DEBUG_PANEL'
