-- FluentCopilot Skill System — storage note (no DDL change).
-- Per-user skill metrics, evidence tail, and snapshots live inside
-- dbo.UserLearningProfiles.ProfileJson under the "userSkillProfile" object
-- (see domain type UserSkillProfile). Session source rows remain in
-- dbo.SessionLearningInsights for optional recompute/replay.
--
-- Repository: backend/src/repositories/userSkillProfileRepository.ts
-- Service:   backend/src/services/skills/userSkillProfilePersistenceService.ts
SET NOCOUNT ON;
GO
