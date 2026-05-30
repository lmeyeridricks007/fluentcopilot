'use client'

import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'

/** External user id sent as `x-user-id` — must match backend seed expectations for local demo. */
export function getApiUserId(): string {
  if (typeof window === 'undefined') return LOCAL_ANONYMOUS_LEARNER_ID
  return useAuthStore.getState().user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID
}
