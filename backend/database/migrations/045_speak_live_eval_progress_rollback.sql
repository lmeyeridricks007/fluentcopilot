SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.LiveSessionEvaluations', N'ProgressJson') IS NOT NULL
BEGIN
  ALTER TABLE dbo.LiveSessionEvaluations DROP COLUMN ProgressJson;
END
GO

PRINT N'045_speak_live_eval_progress_rollback applied.';
GO
