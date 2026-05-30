import type { QuickCaptureApiStatus, QuickCaptureApiType, QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import { parseQuickCaptureEnrichment } from './parseQuickCaptureEnrichment'

export type CaptureBucketId = 'all' | 'inbox' | 'ready' | 'practiced' | 'saved' | 'archived'

export const CAPTURE_BUCKETS: { id: CaptureBucketId; label: string; description: string }[] = [
  { id: 'all', label: 'All', description: 'Everything you saved' },
  { id: 'inbox', label: 'Fresh', description: 'New saves and light touch-ups in progress' },
  { id: 'ready', label: 'Ready', description: 'Ready to practice or already slotted in today’s generated pack' },
  { id: 'practiced', label: 'Practiced', description: 'Already in a finished loop' },
  { id: 'saved', label: 'Kept', description: 'You marked these to keep' },
  { id: 'archived', label: 'Archived', description: 'Out of the way' },
]

const INBOX: QuickCaptureApiStatus[] = ['new', 'enriched']
const READY: QuickCaptureApiStatus[] = ['ready_for_practice', 'included_in_practice']

export function statusesForBucket(bucket: CaptureBucketId): QuickCaptureApiStatus[] | null {
  switch (bucket) {
    case 'inbox':
      return INBOX
    case 'ready':
      return READY
    case 'practiced':
      return ['practiced']
    case 'saved':
      return ['saved_long_term']
    case 'archived':
      return ['archived']
    case 'all':
    default:
      return null
  }
}

export function itemMatchesBucket(item: QuickCaptureItem, bucket: CaptureBucketId): boolean {
  const s = statusesForBucket(bucket)
  if (!s) return true
  return s.includes(item.status)
}

export function itemMatchesType(item: QuickCaptureItem, type: QuickCaptureApiType | 'all'): boolean {
  if (type === 'all') return true
  return item.captureType === type
}

export function itemMatchesDate(item: QuickCaptureItem, dateYmd: string | 'all'): boolean {
  if (dateYmd === 'all') return true
  return item.localCaptureDate === dateYmd
}

export function itemMatchesContextFilter(item: QuickCaptureItem, needle: string | 'all'): boolean {
  if (needle === 'all') return true
  const n = needle.toLowerCase()
  const pk = (item.placeKind ?? '').toLowerCase()
  if (pk && pk.includes(n)) return true
  const en = parseQuickCaptureEnrichment(item)
  const slug = (en?.scenarioSlugGuess ?? '').toLowerCase()
  if (slug && (slug.includes(n) || n.includes(slug))) return true
  for (const tag of en?.tags ?? []) {
    if (tag.toLowerCase().includes(n)) return true
  }
  return false
}

export function recentDateOptions(days = 14): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [{ value: 'all', label: 'Any date' }]
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  for (let i = 0; i < days; i += 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const ymd = d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    out.push({ value: ymd, label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : fmt.format(d) })
  }
  return out
}

export const CAPTURE_TYPE_FILTERS: { value: QuickCaptureApiType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'save_word', label: 'Word' },
  { value: 'save_phrase', label: 'Phrase' },
  { value: 'photo_text', label: 'Photo' },
  { value: 'voice_note', label: 'Voice' },
  { value: 'add_place', label: 'Place' },
  { value: 'paste_text', label: 'Paste' },
  { value: 'log_struggle', label: 'Rough moment' },
]

export const CONTEXT_QUICK_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Any context' },
  { value: 'train', label: 'Train / station' },
  { value: 'shop', label: 'Shop / market' },
  { value: 'doctor', label: 'Health' },
  { value: 'gemeente', label: 'Gemeente' },
]
