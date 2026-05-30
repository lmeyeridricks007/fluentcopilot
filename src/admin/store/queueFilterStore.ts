import { create } from 'zustand'
import type { ArtifactType, ReviewStatus } from '../types/artifacts'

interface QueueFilterState {
  artifact_type: ArtifactType | ''
  review_status: ReviewStatus | ''
  scenario: string
  setArtifactType: (v: ArtifactType | '') => void
  setReviewStatus: (v: ReviewStatus | '') => void
  setScenario: (v: string) => void
  reset: () => void
}

const defaultState = {
  artifact_type: '' as ArtifactType | '',
  review_status: '' as ReviewStatus | '',
  scenario: '',
}

export const useQueueFilterStore = create<QueueFilterState>((set) => ({
  ...defaultState,
  setArtifactType: (artifact_type) => set({ artifact_type }),
  setReviewStatus: (review_status) => set({ review_status }),
  setScenario: (scenario) => set({ scenario }),
  reset: () => set(defaultState),
}))
