export type ListeningWeaknessSignal = {
  id: string
  userId: string
  weaknessKey: string
  severity: number
  evidence: Record<string, unknown> | null
  lastSeenAt: string
  updatedAt: string
}
