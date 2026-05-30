-- Reversible rollback for 032_user_learning_memory (drops objects created there).
SET NOCOUNT ON;
GO

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_SessionLearningInsights_ThreadId'
    AND object_id = OBJECT_ID(N'dbo.SessionLearningInsights', N'U')
)
BEGIN
  DROP INDEX UX_SessionLearningInsights_ThreadId ON dbo.SessionLearningInsights;
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.SessionLearningInsights', N'U'))
BEGIN
  DROP TABLE dbo.SessionLearningInsights;
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.UserLearningProfiles', N'U'))
BEGIN
  DROP TABLE dbo.UserLearningProfiles;
END
GO

PRINT N'032_user_learning_memory_rollback applied.';
GO
