-- Saved training items: FluentCopilot rails (library, coach, review, drills) + structured practice payload.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.SavedTrainingItems', N'SourceScenarioId') IS NULL
  ALTER TABLE dbo.SavedTrainingItems ADD SourceScenarioId NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.SavedTrainingItems', N'LearnerOriginalSentence') IS NULL
  ALTER TABLE dbo.SavedTrainingItems ADD LearnerOriginalSentence NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH(N'dbo.SavedTrainingItems', N'ImprovedSentence') IS NULL
  ALTER TABLE dbo.SavedTrainingItems ADD ImprovedSentence NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH(N'dbo.SavedTrainingItems', N'TagCategory') IS NULL
  ALTER TABLE dbo.SavedTrainingItems ADD TagCategory NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.SavedTrainingItems', N'SuggestedTrainingMode') IS NULL
  ALTER TABLE dbo.SavedTrainingItems ADD SuggestedTrainingMode NVARCHAR(64) NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'IX_SavedTrainingItems_User_Tag_Created' AND object_id = OBJECT_ID(N'dbo.SavedTrainingItems')
)
  CREATE INDEX IX_SavedTrainingItems_User_Tag_Created
    ON dbo.SavedTrainingItems (UserId, TagCategory, CreatedAt DESC);
GO

PRINT N'006_saved_training_training_rails applied.';
GO
