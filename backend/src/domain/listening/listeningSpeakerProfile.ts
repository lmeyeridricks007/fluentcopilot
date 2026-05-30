/** Optional TTS / voice metadata for a clip (extensible). */
export type ListeningSpeakerProfile = {
  voiceToken?: string | null
  /** Browser TTS rate hint 0.72–1.12 */
  speechRateHint?: number | null
  /** e.g. "service_desk", "announcement" */
  register?: string | null
  /** Multi-speaker clip ordering */
  speakerLabels?: string[] | null
}
