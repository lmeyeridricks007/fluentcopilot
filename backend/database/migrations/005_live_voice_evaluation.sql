-- Speak Live post-session voice evaluation persistence + save-for-later training queue.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.LiveSessionEvaluations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.LiveSessionEvaluations (
    ThreadId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(32) NOT NULL
      CONSTRAINT DF_LiveSessionEvaluations_Status DEFAULT N'pending',
    EvaluationJson NVARCHAR(MAX) NULL,
    ErrorMessage NVARCHAR(2000) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LiveSessionEvaluations_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_LiveSessionEvaluations_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_LiveSessionEvaluations PRIMARY KEY (ThreadId),
    CONSTRAINT CK_LiveSessionEvaluations_Status
      CHECK (Status IN (N'pending', N'running', N'complete', N'failed'))
  );
END
GO

IF OBJECT_ID(N'dbo.SavedTrainingItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SavedTrainingItems (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SourceSessionId UNIQUEIDENTIFIER NOT NULL,
    SourceTurnId NVARCHAR(64) NULL,
    ItemType NVARCHAR(64) NOT NULL,
    Title NVARCHAR(512) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    AudioReferenceUrl NVARCHAR(2048) NULL,
    LearnerAudioUrl NVARCHAR(2048) NULL,
    MetadataJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SavedTrainingItems_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SavedTrainingItems PRIMARY KEY (Id)
  );
  CREATE INDEX IX_SavedTrainingItems_User_Created
    ON dbo.SavedTrainingItems (UserId, CreatedAt DESC);
END
GO

PRINT N'005_live_voice_evaluation applied.';
GO
