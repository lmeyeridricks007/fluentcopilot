SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.ExamReadinessSnapshots', N'U') IS NOT NULL
  DROP TABLE dbo.ExamReadinessSnapshots;
GO

IF OBJECT_ID(N'dbo.ExamReports', N'U') IS NOT NULL
  DROP TABLE dbo.ExamReports;
GO

IF OBJECT_ID(N'dbo.ExamTaskRuns', N'U') IS NOT NULL
  DROP TABLE dbo.ExamTaskRuns;
GO

IF OBJECT_ID(N'dbo.ExamSessions', N'U') IS NOT NULL
  DROP TABLE dbo.ExamSessions;
GO

IF OBJECT_ID(N'dbo.ExamProfiles', N'U') IS NOT NULL
  DROP TABLE dbo.ExamProfiles;
GO

PRINT N'044_exam_persistence rolled back.';
GO
