SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U') IS NOT NULL
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_PersonalizedTrainingLoops_SourceType'
      AND parent_object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U')
  )
  BEGIN
    ALTER TABLE dbo.PersonalizedTrainingLoops DROP CONSTRAINT CK_PersonalizedTrainingLoops_SourceType;
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_PersonalizedTrainingLoops_SourceType'
      AND parent_object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U')
  )
  BEGIN
    ALTER TABLE dbo.PersonalizedTrainingLoops
      ADD CONSTRAINT CK_PersonalizedTrainingLoops_SourceType CHECK (
        SourceType IN (N'scenario', N'coach', N'chat', N'read_aloud', N'listening', N'quick_capture')
      );
  END
END
ELSE
BEGIN
  PRINT N'042 skipped: dbo.PersonalizedTrainingLoops does not exist — apply migration 034 first.';
END
GO

PRINT N'042_training_loop_quick_capture_source applied.';
GO
