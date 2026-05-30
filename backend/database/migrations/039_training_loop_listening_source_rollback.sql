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
        SourceType IN (N'scenario', N'coach', N'chat', N'read_aloud')
      );
  END
END
ELSE
BEGIN
  PRINT N'039 rollback skipped: dbo.PersonalizedTrainingLoops does not exist.';
END
GO

PRINT N'039_training_loop_listening_source rolled back.';
GO
