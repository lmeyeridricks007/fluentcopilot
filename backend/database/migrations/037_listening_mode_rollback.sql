SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.ListeningReports', N'U') IS NOT NULL
  DROP TABLE dbo.ListeningReports;
GO

IF OBJECT_ID(N'dbo.ListeningAttempts', N'U') IS NOT NULL
  DROP TABLE dbo.ListeningAttempts;
GO

IF OBJECT_ID(N'dbo.ListeningWeaknessSignals', N'U') IS NOT NULL
  DROP TABLE dbo.ListeningWeaknessSignals;
GO

IF OBJECT_ID(N'dbo.ListeningSessions', N'U') IS NOT NULL
  DROP TABLE dbo.ListeningSessions;
GO

IF OBJECT_ID(N'dbo.ListeningClipLibrary', N'U') IS NOT NULL
  DROP TABLE dbo.ListeningClipLibrary;
GO

PRINT N'037_listening_mode rolled back.';
GO
