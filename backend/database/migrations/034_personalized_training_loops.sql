SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PersonalizedTrainingLoops (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SourceSessionId NVARCHAR(64) NOT NULL,
    ThreadId UNIQUEIDENTIFIER NULL,
    SourceType NVARCHAR(32) NOT NULL,
    SourceScenarioId UNIQUEIDENTIFIER NULL,
    LoopType NVARCHAR(48) NOT NULL,
    LoopSlot TINYINT NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_LoopSlot DEFAULT 0,
    Title NVARCHAR(256) NOT NULL,
    Subtitle NVARCHAR(512) NULL,
    Reason NVARCHAR(1024) NOT NULL,
    TargetSkillsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_TargetSkills DEFAULT N'[]',
    TargetWeaknessKeysJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_TargetWeakness DEFAULT N'[]',
    EstimatedMinutes FLOAT NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_EstMinutes DEFAULT 1,
    Difficulty NVARCHAR(16) NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_Difficulty DEFAULT N'moderate',
    PayloadJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_Payload DEFAULT N'{}',
    Status NVARCHAR(32) NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_Status DEFAULT N'active',
    Confidence NVARCHAR(16) NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_Confidence DEFAULT N'medium',
    PriorityScore FLOAT NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_Priority DEFAULT 0,
    DedupeKey NVARCHAR(160) NULL,
    GenerationDebugJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PersonalizedTrainingLoops_UpdatedAt DEFAULT SYSUTCDATETIME(),
    ExpiresAt DATETIME2 NULL,
    CONSTRAINT PK_PersonalizedTrainingLoops PRIMARY KEY (Id),
    CONSTRAINT FK_PersonalizedTrainingLoops_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_PersonalizedTrainingLoops_Thread FOREIGN KEY (ThreadId) REFERENCES dbo.ConversationThreads (Id),
    CONSTRAINT CK_PersonalizedTrainingLoops_SourceType CHECK (
      SourceType IN (N'scenario', N'coach', N'chat', N'read_aloud')
    ),
    CONSTRAINT CK_PersonalizedTrainingLoops_Status CHECK (
      Status IN (N'active', N'in_progress', N'completed', N'dismissed', N'stale')
    ),
    CONSTRAINT CK_PersonalizedTrainingLoops_LoopSlot CHECK (LoopSlot IN (0, 1, 2))
  );

  CREATE INDEX IX_PersonalizedTrainingLoops_User_Status_Priority
    ON dbo.PersonalizedTrainingLoops (UserId, Status, PriorityScore DESC)
    INCLUDE (LoopSlot, ExpiresAt, CreatedAt);

  CREATE INDEX IX_PersonalizedTrainingLoops_User_SourceSession
    ON dbo.PersonalizedTrainingLoops (UserId, SourceSessionId);
END
GO

PRINT N'034_personalized_training_loops applied.';
GO
