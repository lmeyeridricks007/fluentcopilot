/** Deep link for full weak-area coaching (Improve drill). */
export function improveWeakDrillHref(weakAreaId: string): string {
  return `/app/practice/improve/weak/${encodeURIComponent(weakAreaId)}`
}
