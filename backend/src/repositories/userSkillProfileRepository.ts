/**
 * Skill profile persistence — **document path** on `dbo.UserLearningProfiles.ProfileJson.userSkillProfile`.
 *
 * No separate `user_skill_profiles` table: keeps the existing merge + backup story (see migration 032).
 * Optional relational tables could be added later without breaking reads if a sync job maintains JSON.
 */
import type sql from 'mssql'
import type { SkillId, UserSkillProfile } from '../domain/skills/skillTypes'
import {
  parseUserLearningProfileDocument,
  serializeUserLearningProfileDocument,
  USER_LEARNING_PROFILE_SCHEMA_VERSION,
  type UserLearningProfile,
} from '../domain/learningMemory/userLearningProfileDocument'
import { createEmptyUserSkillProfile } from '../domain/skills/skillProfileDefaults'
import * as learningRepo from './userLearningMemoryRepository'

async function loadLearningDoc(pool: sql.ConnectionPool, userId: string): Promise<UserLearningProfile> {
  const raw = await learningRepo.getUserLearningProfileJson(pool, userId)
  return parseUserLearningProfileDocument(raw, userId)
}

async function persistLearningDoc(pool: sql.ConnectionPool, userId: string, doc: UserLearningProfile): Promise<void> {
  const merged: UserLearningProfile = { ...doc, userId: doc.userId ?? userId }
  const json = serializeUserLearningProfileDocument(merged)
  await learningRepo.upsertUserLearningProfile(pool, userId, json, USER_LEARNING_PROFILE_SCHEMA_VERSION)
}

export async function getUserSkillProfile(pool: sql.ConnectionPool, userId: string): Promise<UserSkillProfile> {
  const doc = await loadLearningDoc(pool, userId)
  return doc.userSkillProfile ?? createEmptyUserSkillProfile(userId)
}

export async function saveUserSkillProfile(
  pool: sql.ConnectionPool,
  userId: string,
  profile: UserSkillProfile,
): Promise<void> {
  const doc = await loadLearningDoc(pool, userId)
  doc.userSkillProfile = { ...profile, userId: profile.userId || userId }
  doc.updatedAt = new Date().toISOString()
  await persistLearningDoc(pool, userId, doc)
}

export async function patchUserSkillProfile(
  pool: sql.ConnectionPool,
  userId: string,
  updater: (prev: UserSkillProfile) => UserSkillProfile,
): Promise<UserSkillProfile> {
  const doc = await loadLearningDoc(pool, userId)
  const prev = doc.userSkillProfile ?? createEmptyUserSkillProfile(userId)
  const next = updater(prev)
  doc.userSkillProfile = { ...next, userId: next.userId || userId }
  doc.updatedAt = new Date().toISOString()
  await persistLearningDoc(pool, userId, doc)
  return doc.userSkillProfile
}

export async function getSkillMetrics(
  pool: sql.ConnectionPool,
  userId: string,
): Promise<UserSkillProfile['metrics']> {
  const sp = await getUserSkillProfile(pool, userId)
  return sp.metrics
}

export async function getSkillMetric(
  pool: sql.ConnectionPool,
  userId: string,
  skillId: SkillId,
): Promise<UserSkillProfile['metrics'][SkillId] | null> {
  const m = await getSkillMetrics(pool, userId)
  return m[skillId] ?? null
}
