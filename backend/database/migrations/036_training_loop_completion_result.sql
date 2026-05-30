SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.PersonalizedTrainingLoops', N'CompletionResultJson') IS NULL
BEGIN
  ALTER TABLE dbo.PersonalizedTrainingLoops
    ADD CompletionResultJson NVARCHAR(MAX) NULL;
END
GO

PRINT N'036_training_loop_completion_result applied.';
GO
