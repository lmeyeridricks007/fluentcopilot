SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.PersonalizedTrainingLoops', N'CompletionResultJson') IS NOT NULL
BEGIN
  ALTER TABLE dbo.PersonalizedTrainingLoops DROP COLUMN CompletionResultJson;
END
GO

PRINT N'036_training_loop_completion_result rolled back.';
GO
