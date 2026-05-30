-- Allow listening sessions in SessionLearningInsights (analytics / future full merge).
SET NOCOUNT ON;
GO

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_SessionLearningInsights_SessionType'
    AND parent_object_id = OBJECT_ID(N'dbo.SessionLearningInsights', N'U')
)
BEGIN
  ALTER TABLE dbo.SessionLearningInsights DROP CONSTRAINT CK_SessionLearningInsights_SessionType;
END
GO

ALTER TABLE dbo.SessionLearningInsights
  ADD CONSTRAINT CK_SessionLearningInsights_SessionType CHECK (
    SessionType IN (N'speak_live', N'text_conversation', N'read_aloud', N'listening')
  );
GO

PRINT N'038_session_learning_insights_listening applied.';
GO
