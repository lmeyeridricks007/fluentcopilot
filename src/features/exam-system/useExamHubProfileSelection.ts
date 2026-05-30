'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useLearnerProfileStore } from '@/lib/profile/profileStore'
import { useStudyContextStore } from '@/store/studyContextStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { ExamLevel } from '@/lib/exam-system/types'
import {
  preferredExamLevelFromLearner,
  resolveExamProfileIdForPreferredLevel,
} from '@/lib/exam-system/examHubSelection'
import { fetchExamProfiles, getExamProfileSummariesFromRegistry, type ExamProfileSummary } from './examApi'

type Options = {
  /** When set, keeps the same exam module but maps level → learner preferred level. */
  profileFromUrl?: string
}

/**
 * Shared exam-hub profile picker state: defaults to the learner's CEFR level (profile → study
 * context → session) and re-syncs when the durable profile hydrates — so the UI does not stick on
 * A1 from a stale first paint.
 */
export function useExamHubProfileSelection(options: Options = {}) {
  const profileFromUrl = options.profileFromUrl?.trim() ?? ''
  const user = useAuthStore((s) => s.user)
  const userId = user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID
  const profileDoc = useLearnerProfileStore((s) => s.document)
  const profileStatus = useLearnerProfileStore((s) => s.status)
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)

  const preferredLevel = useMemo(
    () => preferredExamLevelFromLearner(user, profileDoc, activeStudyLevel),
    [user, profileDoc, activeStudyLevel],
  )

  const userPickedRef = useRef(false)
  const initialExamProfiles = useMemo(() => getExamProfileSummariesFromRegistry(), [])
  const profilesQ = useQuery({
    queryKey: ['exam', 'profiles'],
    queryFn: fetchExamProfiles,
    initialData: initialExamProfiles,
    staleTime: 60 * 60 * 1000,
  })

  const [profileId, setProfileIdRaw] = useState('')

  const setProfileId = useCallback((id: string) => {
    userPickedRef.current = true
    setProfileIdRaw(id)
  }, [])

  const resolveDefaultId = useCallback(
    (rows: ExamProfileSummary[]) =>
      resolveExamProfileIdForPreferredLevel(rows, preferredLevel, {
        profileFromUrl: userPickedRef.current ? undefined : profileFromUrl || undefined,
      }),
    [preferredLevel, profileFromUrl],
  )

  useEffect(() => {
    const rows = profilesQ.data
    if (!rows?.length) return
    if (profileStatus === 'loading') return

    if (userPickedRef.current) {
      if (!profileId || !rows.some((p) => p.examId === profileId)) {
        setProfileIdRaw(resolveDefaultId(rows))
      }
      return
    }

    const active = rows.find((p) => p.examId === profileId)
    const targetId = resolveDefaultId(rows)
    if (!profileId || !active || active.level !== preferredLevel) {
      if (targetId !== profileId) setProfileIdRaw(targetId)
    }
  }, [
    profilesQ.data,
    preferredLevel,
    profileId,
    profileDoc?.currentLevel,
    activeStudyLevel,
    profileStatus,
    profileFromUrl,
    resolveDefaultId,
  ])

  const activeProfile = profilesQ.data?.find((p) => p.examId === profileId)
  const level: ExamLevel = activeProfile?.level ?? preferredLevel

  return {
    userId,
    profileId,
    setProfileId,
    preferredLevel,
    level,
    profilesQ,
    activeProfile,
  }
}
