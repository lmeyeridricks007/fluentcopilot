SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.TrainingLoopEvents', N'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.TrainingLoopEvents;
END
GO

IF OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PersonalizedTrainingLoops_User_Status_CreatedAt' AND object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U'))
    DROP INDEX IX_PersonalizedTrainingLoops_User_Status_CreatedAt ON dbo.PersonalizedTrainingLoops;
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PersonalizedTrainingLoops_User_SourceType_CreatedAt' AND object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U'))
    DROP INDEX IX_PersonalizedTrainingLoops_User_SourceType_CreatedAt ON dbo.PersonalizedTrainingLoops;
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PersonalizedTrainingLoops_User_LoopType_CreatedAt' AND object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U'))
    DROP INDEX IX_PersonalizedTrainingLoops_User_LoopType_CreatedAt ON dbo.PersonalizedTrainingLoops;
END
GO
