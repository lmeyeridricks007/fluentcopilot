-- Progressive / async Speak Live evaluation status (polls GET evaluation while worker runs).
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.LiveSessionEvaluations', N'ProgressJson') IS NULL
BEGIN
  ALTER TABLE dbo.LiveSessionEvaluations
    ADD ProgressJson NVARCHAR(MAX) NULL;
END
GO

PRINT N'045_speak_live_eval_progress applied.';
GO
