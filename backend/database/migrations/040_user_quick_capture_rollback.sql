SET NOCOUNT ON;
GO

IF EXISTS (
  SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_UserQuickCaptures_DayPack'
)
BEGIN
  ALTER TABLE dbo.UserQuickCaptures DROP CONSTRAINT FK_UserQuickCaptures_DayPack;
END
GO

IF OBJECT_ID(N'dbo.UserQuickCaptures', N'U') IS NOT NULL
  DROP TABLE dbo.UserQuickCaptures;
GO

IF OBJECT_ID(N'dbo.UserDayPracticePacks', N'U') IS NOT NULL
  DROP TABLE dbo.UserDayPracticePacks;
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

PRINT N'040_user_quick_capture rolled back.';
GO
