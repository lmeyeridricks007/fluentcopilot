SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.PersonalizedTrainingLoops;
END
GO
