SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.UserPersonalizedPracticePacks', N'U') IS NOT NULL
  DROP TABLE dbo.UserPersonalizedPracticePacks;
GO

IF OBJECT_ID(N'dbo.UserDailyCaptureBundles', N'U') IS NOT NULL
  DROP TABLE dbo.UserDailyCaptureBundles;
GO

IF OBJECT_ID(N'dbo.UserCaptureItems', N'U') IS NOT NULL
  DROP TABLE dbo.UserCaptureItems;
GO

IF OBJECT_ID(N'dbo.UserPlaceItems', N'U') IS NOT NULL
  DROP TABLE dbo.UserPlaceItems;
GO

PRINT N'041_quick_capture_domain_model rolled back.';
GO
