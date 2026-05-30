SET NOCOUNT ON;
GO

-- Extra retrieval indexes (034 created core table + two indexes).
IF OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_PersonalizedTrainingLoops_User_Status_CreatedAt'
      AND object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U')
  )
  BEGIN
    CREATE INDEX IX_PersonalizedTrainingLoops_User_Status_CreatedAt
      ON dbo.PersonalizedTrainingLoops (UserId, Status, CreatedAt DESC);
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_PersonalizedTrainingLoops_User_SourceType_CreatedAt'
      AND object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U')
  )
  BEGIN
    CREATE INDEX IX_PersonalizedTrainingLoops_User_SourceType_CreatedAt
      ON dbo.PersonalizedTrainingLoops (UserId, SourceType, CreatedAt DESC);
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_PersonalizedTrainingLoops_User_LoopType_CreatedAt'
      AND object_id = OBJECT_ID(N'dbo.PersonalizedTrainingLoops', N'U')
  )
  BEGIN
    CREATE INDEX IX_PersonalizedTrainingLoops_User_LoopType_CreatedAt
      ON dbo.PersonalizedTrainingLoops (UserId, LoopType, CreatedAt DESC);
  END
END
GO

IF OBJECT_ID(N'dbo.TrainingLoopEvents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TrainingLoopEvents (
    Id UNIQUEIDENTIFIER NOT NULL,
    LoopId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    EventType NVARCHAR(32) NOT NULL,
    ResultJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TrainingLoopEvents_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TrainingLoopEvents PRIMARY KEY (Id),
    CONSTRAINT FK_TrainingLoopEvents_Loop FOREIGN KEY (LoopId) REFERENCES dbo.PersonalizedTrainingLoops (Id),
    CONSTRAINT FK_TrainingLoopEvents_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_TrainingLoopEvents_EventType CHECK (
      EventType IN (N'started', N'completed', N'dismissed', N'stale_marked', N'patched')
    )
  );

  CREATE INDEX IX_TrainingLoopEvents_Loop_Created
    ON dbo.TrainingLoopEvents (LoopId, CreatedAt DESC);

  CREATE INDEX IX_TrainingLoopEvents_User_Created
    ON dbo.TrainingLoopEvents (UserId, CreatedAt DESC);
END
GO

PRINT N'035_training_loop_events_and_indexes applied.';
GO
