import type { ExamLevel, ExamProfile } from './types'
import {
  getExamProfile as getFromRegistry,
  getExamProfileByCodeAndLevel as getByCodeLevel,
  listExamProfiles as listFromRegistry,
} from './profileRegistry/registry'

export function listExamProfiles(): ExamProfile[] {
  return listFromRegistry()
}

export function getExamProfile(examId: string): ExamProfile | undefined {
  return getFromRegistry(examId)
}

export function getExamProfileByCodeAndLevel(examCode: string, level: ExamLevel): ExamProfile | undefined {
  return getByCodeLevel(examCode, level)
}
