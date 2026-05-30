-- Listening mode: first-class sessions, attempts, reports, weakness signals, optional clip library.
-- Does not modify SessionLearningInsights or ConversationThreads.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.ListeningClipLibrary', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ListeningClipLibrary (
    Id UNIQUEIDENTIFIER NOT NULL,
    ClipKey NVARCHAR(128) NOT NULL,
    ScenarioKey NVARCHAR(96) NOT NULL,
    Category NVARCHAR(96) NULL,
    Level NVARCHAR(16) NOT NULL,
    DrillType NVARCHAR(32) NOT NULL,
    SpeakerProfileJson NVARCHAR(MAX) NULL,
    Transcript NVARCHAR(MAX) NOT NULL,
    NormalizedTranscript NVARCHAR(MAX) NULL,
    TargetMeaning NVARCHAR(MAX) NULL,
    KeyDetailsJson NVARCHAR(MAX) NULL,
    ResponseExpectationJson NVARCHAR(MAX) NULL,
    AudioUrl NVARCHAR(2048) NULL,
    SlowerAudioUrl NVARCHAR(2048) NULL,
    MetadataJson NVARCHAR(MAX) NULL,
    SchemaVersion INT NOT NULL CONSTRAINT DF_ListeningClipLibrary_Schema DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningClipLibrary_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningClipLibrary_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ListeningClipLibrary PRIMARY KEY (Id),
    CONSTRAINT UX_ListeningClipLibrary_ClipKey UNIQUE (ClipKey),
    CONSTRAINT CK_ListeningClipLibrary_DrillType CHECK (
      DrillType IN (
        N'gist',
        N'detail',
        N'listen_respond',
        N'instruction',
        N'fast_speech',
        N'replay_reveal',
        N'personalized_focus'
      )
    )
  );
  CREATE INDEX IX_ListeningClipLibrary_Scenario_Level
    ON dbo.ListeningClipLibrary (ScenarioKey, Level);
END
GO

IF OBJECT_ID(N'dbo.ListeningSessions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ListeningSessions (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    TrackId NVARCHAR(64) NULL,
    ScenarioKey NVARCHAR(96) NULL,
    Category NVARCHAR(96) NOT NULL CONSTRAINT DF_ListeningSessions_Category DEFAULT N'general',
    Level NVARCHAR(16) NOT NULL,
    DrillIdsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ListeningSessions_DrillIds DEFAULT N'[]',
    Status NVARCHAR(24) NOT NULL CONSTRAINT DF_ListeningSessions_Status DEFAULT N'in_progress',
    ClientSessionKey NVARCHAR(128) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    CONSTRAINT PK_ListeningSessions PRIMARY KEY (Id),
    CONSTRAINT FK_ListeningSessions_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_ListeningSessions_Status CHECK (
      Status IN (N'in_progress', N'completed', N'abandoned')
    )
  );
  CREATE INDEX IX_ListeningSessions_User_Created
    ON dbo.ListeningSessions (UserId, CreatedAt DESC);
  CREATE INDEX IX_ListeningSessions_User_Status
    ON dbo.ListeningSessions (UserId, Status, CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.ListeningAttempts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ListeningAttempts (
    Id UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    ClipKey NVARCHAR(128) NOT NULL,
    DrillType NVARCHAR(32) NOT NULL,
    AnswerJson NVARCHAR(MAX) NOT NULL,
    AnswerMode NVARCHAR(24) NOT NULL,
    CorrectGist BIT NULL,
    CorrectDetails BIT NULL,
    ReplayCount INT NOT NULL CONSTRAINT DF_ListeningAttempts_Replay DEFAULT 0,
    SlowerReplayUsed BIT NOT NULL CONSTRAINT DF_ListeningAttempts_Slower DEFAULT 0,
    TranscriptRevealed BIT NOT NULL CONSTRAINT DF_ListeningAttempts_Transcript DEFAULT 0,
    ResponseLatencyMs INT NULL,
    EvaluationJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningAttempts_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ListeningAttempts PRIMARY KEY (Id),
    CONSTRAINT FK_ListeningAttempts_Session FOREIGN KEY (SessionId) REFERENCES dbo.ListeningSessions (Id) ON DELETE CASCADE,
    CONSTRAINT CK_ListeningAttempts_DrillType CHECK (
      DrillType IN (
        N'gist',
        N'detail',
        N'listen_respond',
        N'instruction',
        N'fast_speech',
        N'replay_reveal',
        N'personalized_focus'
      )
    ),
    CONSTRAINT CK_ListeningAttempts_AnswerMode CHECK (
      AnswerMode IN (N'mcq', N'tap', N'voice', N'skipped')
    )
  );
  CREATE INDEX IX_ListeningAttempts_Session_Created
    ON dbo.ListeningAttempts (SessionId, CreatedAt);
END
GO

IF OBJECT_ID(N'dbo.ListeningReports', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ListeningReports (
    Id UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SummaryJson NVARCHAR(MAX) NOT NULL,
    DimensionsJson NVARCHAR(MAX) NULL,
    WeakAreasJson NVARCHAR(MAX) NULL,
    MissedDetailsJson NVARCHAR(MAX) NULL,
    RecommendedNextJson NVARCHAR(MAX) NULL,
    RelatedPracticeLoopsJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningReports_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ListeningReports PRIMARY KEY (Id),
    CONSTRAINT FK_ListeningReports_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_ListeningReports_Session FOREIGN KEY (SessionId) REFERENCES dbo.ListeningSessions (Id) ON DELETE CASCADE,
    CONSTRAINT UX_ListeningReports_Session UNIQUE (SessionId)
  );
  CREATE INDEX IX_ListeningReports_User_Created
    ON dbo.ListeningReports (UserId, CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.ListeningWeaknessSignals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ListeningWeaknessSignals (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    WeaknessKey NVARCHAR(96) NOT NULL,
    Severity FLOAT NOT NULL CONSTRAINT DF_ListeningWeaknessSignals_Sev DEFAULT 0,
    EvidenceJson NVARCHAR(MAX) NULL,
    LastSeenAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningWeaknessSignals_LastSeen DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListeningWeaknessSignals_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ListeningWeaknessSignals PRIMARY KEY (Id),
    CONSTRAINT FK_ListeningWeaknessSignals_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT UX_ListeningWeaknessSignals_User_Key UNIQUE (UserId, WeaknessKey)
  );
  CREATE INDEX IX_ListeningWeaknessSignals_User_Severity
    ON dbo.ListeningWeaknessSignals (UserId, Severity DESC);
END
GO

PRINT N'037_listening_mode applied.';
GO
