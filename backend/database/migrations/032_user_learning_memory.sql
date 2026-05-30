-- Persistent user learning profile + per-session insight log for personalization.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.UserLearningProfiles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserLearningProfiles (
    UserId UNIQUEIDENTIFIER NOT NULL,
    ProfileJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_UserLearningProfiles_Json DEFAULT N'{}',
    SchemaVersion INT NOT NULL CONSTRAINT DF_UserLearningProfiles_Schema DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserLearningProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserLearningProfiles_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserLearningProfiles PRIMARY KEY (UserId),
    CONSTRAINT FK_UserLearningProfiles_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
  );
END
GO

IF OBJECT_ID(N'dbo.SessionLearningInsights', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SessionLearningInsights (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SessionType NVARCHAR(32) NOT NULL,
    ThreadId UNIQUEIDENTIFIER NULL,
    ScenarioId UNIQUEIDENTIFIER NULL,
    InsightsJson NVARCHAR(MAX) NOT NULL,
    SignalsJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SessionLearningInsights_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SessionLearningInsights PRIMARY KEY (Id),
    CONSTRAINT FK_SessionLearningInsights_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_SessionLearningInsights_Thread FOREIGN KEY (ThreadId) REFERENCES dbo.ConversationThreads (Id),
    CONSTRAINT CK_SessionLearningInsights_SessionType CHECK (
      SessionType IN (N'speak_live', N'text_conversation', N'read_aloud')
    )
  );
  CREATE INDEX IX_SessionLearningInsights_User_Created
    ON dbo.SessionLearningInsights (UserId, CreatedAt DESC);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_SessionLearningInsights_ThreadId'
    AND object_id = OBJECT_ID(N'dbo.SessionLearningInsights', N'U')
)
BEGIN
  CREATE UNIQUE INDEX UX_SessionLearningInsights_ThreadId
    ON dbo.SessionLearningInsights (ThreadId)
    WHERE ThreadId IS NOT NULL;
END
GO

PRINT N'032_user_learning_memory applied.';
GO
