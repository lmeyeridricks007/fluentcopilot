/**
 * Mission progress from practice is applied inside `recordPracticeScenarioComplete` /
 * `recordSkillTrackSessionComplete` via `applyMissionSignal`.
 * This module documents the contract; use `applyMissionSignal` from `@/lib/missions` for extensions.
 */
export { applyMissionSignal } from '@/lib/missions/missionProgressTracker'
