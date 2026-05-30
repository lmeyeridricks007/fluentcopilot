-- Generated interactive exercise packs (domain persistence)
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.GeneratedExercisePacks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.GeneratedExercisePacks (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SourceCaptureIdsJson NVARCHAR(MAX) NOT NULL,
    Title NVARCHAR(500) NOT NULL,
    Subtitle NVARCHAR(1000) NULL,
    EstimatedMinutes INT NOT NULL
      CONSTRAINT DF_GeneratedExercisePacks_EstimatedMinutes DEFAULT 5,
    Level NVARCHAR(16) NOT NULL
      CONSTRAINT DF_GeneratedExercisePacks_Level DEFAULT N'mixed',
    Theme NVARCHAR(500) NULL,
    PackType NVARCHAR(40) NOT NULL,
    BlocksJson NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(24) NOT NULL
      CONSTRAINT DF_GeneratedExercisePacks_Status DEFAULT N'ready',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GeneratedExercisePacks_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_GeneratedExercisePacks_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    XpPotential INT NOT NULL
      CONSTRAINT DF_GeneratedExercisePacks_XpPotential DEFAULT 0,
    XpAwarded INT NULL,
    TotalBlocks INT NOT NULL
      CONSTRAINT DF_GeneratedExercisePacks_TotalBlocks DEFAULT 0,
    CompletedBlocks INT NOT NULL
      CONSTRAINT DF_GeneratedExercisePacks_CompletedBlocks DEFAULT 0,
    LastOpenedAt DATETIME2 NULL,
    LastCompletedBlockId NVARCHAR(80) NULL,
    CONSTRAINT PK_GeneratedExercisePacks PRIMARY KEY (Id),
    CONSTRAINT FK_GeneratedExercisePacks_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_GeneratedExercisePacks_Level CHECK (
      Level IN (N'A1', N'A2', N'B1', N'mixed')
    ),
    CONSTRAINT CK_GeneratedExercisePacks_PackType CHECK (
      PackType IN (
        N'from_your_day',
        N'capture_word',
        N'capture_phrase',
        N'capture_text',
        N'capture_struggle',
        N'capture_voice_note'
      )
    ),
    CONSTRAINT CK_GeneratedExercisePacks_Status CHECK (
      Status IN (N'ready', N'started', N'completed', N'archived')
    )
  );
  CREATE INDEX IX_GeneratedExercisePacks_User_Created
    ON dbo.GeneratedExercisePacks (UserId, CreatedAt DESC);
  CREATE INDEX IX_GeneratedExercisePacks_User_Status
    ON dbo.GeneratedExercisePacks (UserId, Status, UpdatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.GeneratedExerciseBlockResults', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.GeneratedExerciseBlockResults (
    Id UNIQUEIDENTIFIER NOT NULL,
    PackId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    BlockId NVARCHAR(80) NOT NULL,
    Correctness DECIMAL(7, 6) NULL,
    CompletionScore DECIMAL(7, 6) NULL,
    UserAnswerJson NVARCHAR(MAX) NULL,
    NotesJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GeneratedExerciseBlockResults_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_GeneratedExerciseBlockResults_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_GeneratedExerciseBlockResults PRIMARY KEY (Id),
    CONSTRAINT FK_GeneratedExerciseBlockResults_Pack FOREIGN KEY (PackId) REFERENCES dbo.GeneratedExercisePacks (Id) ON DELETE CASCADE,
    CONSTRAINT FK_GeneratedExerciseBlockResults_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT UQ_GeneratedExerciseBlockResults_Pack_Block UNIQUE (PackId, BlockId)
  );
  CREATE INDEX IX_GeneratedExerciseBlockResults_User_Updated
    ON dbo.GeneratedExerciseBlockResults (UserId, UpdatedAt DESC);
END
GO
