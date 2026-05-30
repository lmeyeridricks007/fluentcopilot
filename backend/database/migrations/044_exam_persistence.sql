-- Fluent Exam — persistent profiles, sessions, task runs, reports, readiness snapshots
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.ExamProfiles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ExamProfiles (
    Id UNIQUEIDENTIFIER NOT NULL,
    ExamCode NVARCHAR(64) NOT NULL,
    Level NVARCHAR(8) NOT NULL,
    Title NVARCHAR(256) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    SimulationBlueprintJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_ExamProfiles_SimBlueprint DEFAULT N'{}',
    TrainingBlueprintJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_ExamProfiles_TrainBlueprint DEFAULT N'{}',
    ScoringBlueprintJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_ExamProfiles_ScoringBlueprint DEFAULT N'{}',
    UiConfigJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_ExamProfiles_UiConfig DEFAULT N'{}',
    PassThresholdsJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_ExamProfiles_PassThresholds DEFAULT N'{}',
    ReadinessConfigJson NVARCHAR(MAX) NOT NULL
      CONSTRAINT DF_ExamProfiles_ReadinessConfig DEFAULT N'{}',
    SchemaVersion INT NOT NULL CONSTRAINT DF_ExamProfiles_SchemaVersion DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamProfiles_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ExamProfiles PRIMARY KEY (Id),
    CONSTRAINT UQ_ExamProfiles_ExamCode_Level UNIQUE (ExamCode, Level),
    CONSTRAINT CK_ExamProfiles_Level CHECK (Level IN (N'A1', N'A2', N'B1'))
  );
END
GO

IF OBJECT_ID(N'dbo.ExamSessions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ExamSessions (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    ProfileId UNIQUEIDENTIFIER NOT NULL,
    Level NVARCHAR(8) NOT NULL,
    Mode NVARCHAR(20) NOT NULL,
    SupportMode NVARCHAR(24) NULL,
    SectionId NVARCHAR(64) NULL,
    Scope NVARCHAR(16) NOT NULL CONSTRAINT DF_ExamSessions_Scope DEFAULT N'full',
    Status NVARCHAR(24) NOT NULL,
    StartedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamSessions_StartedAt DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    TotalXP INT NULL,
    ReadinessEstimate FLOAT NULL,
    Confidence NVARCHAR(16) NULL,
    MetaJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamSessions_MetaJson DEFAULT N'{}',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamSessions_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ExamSessions PRIMARY KEY (Id),
    CONSTRAINT FK_ExamSessions_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_ExamSessions_Profile FOREIGN KEY (ProfileId) REFERENCES dbo.ExamProfiles (Id),
    CONSTRAINT CK_ExamSessions_Level CHECK (Level IN (N'A1', N'A2', N'B1')),
    CONSTRAINT CK_ExamSessions_Mode CHECK (Mode IN (N'simulation', N'training')),
    CONSTRAINT CK_ExamSessions_SupportMode CHECK (
      SupportMode IS NULL
      OR SupportMode IN (N'none', N'full_guidance', N'light_guidance', N'almost_exam')
    ),
    CONSTRAINT CK_ExamSessions_Scope CHECK (Scope IN (N'full', N'section')),
    CONSTRAINT CK_ExamSessions_Status CHECK (
      Status IN (N'draft', N'in_progress', N'completed', N'abandoned')
    )
  );
  CREATE INDEX IX_ExamSessions_User_UpdatedAt ON dbo.ExamSessions (UserId, UpdatedAt DESC);
  CREATE INDEX IX_ExamSessions_User_Profile_Mode ON dbo.ExamSessions (UserId, ProfileId, Mode, Status);
END
GO

IF OBJECT_ID(N'dbo.ExamTaskRuns', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ExamTaskRuns (
    Id UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    TaskBlueprintId NVARCHAR(128) NOT NULL,
    TaskType NVARCHAR(48) NOT NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_ExamTaskRuns_SortOrder DEFAULT 0,
    Prompt NVARCHAR(MAX) NOT NULL,
    PromptMetaJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamTaskRuns_PromptMeta DEFAULT N'{}',
    PrepStartedAt DATETIME2 NULL,
    AnswerStartedAt DATETIME2 NULL,
    AnswerEndedAt DATETIME2 NULL,
    AudioUrl NVARCHAR(2048) NULL,
    TextAnswer NVARCHAR(MAX) NULL,
    ScoreBreakdownJson NVARCHAR(MAX) NULL,
    FeedbackSummary NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamTaskRuns_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamTaskRuns_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ExamTaskRuns PRIMARY KEY (Id),
    CONSTRAINT FK_ExamTaskRuns_Session FOREIGN KEY (SessionId) REFERENCES dbo.ExamSessions (Id) ON DELETE CASCADE,
    CONSTRAINT CK_ExamTaskRuns_TaskType CHECK (
      TaskType IN (
        N'practical_request',
        N'short_response',
        N'roleplay',
        N'describe_situation',
        N'explain_process',
        N'give_opinion',
        N'justify_reason',
        N'follow_up_response',
        N'compare_options',
        N'storytelling',
        N'sequencing',
        N'read_aloud_exam',
        N'listening_response_exam',
        N'writing_task_exam'
      )
    )
  );
  CREATE INDEX IX_ExamTaskRuns_Session_Sort ON dbo.ExamTaskRuns (SessionId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.ExamReports', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ExamReports (
    Id UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    Mode NVARCHAR(20) NOT NULL,
    Level NVARCHAR(8) NOT NULL,
    OverallOutcome NVARCHAR(64) NOT NULL,
    ReadinessState NVARCHAR(32) NOT NULL,
    Confidence NVARCHAR(16) NOT NULL,
    SectionBreakdownJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamReports_SectionBreakdown DEFAULT N'[]',
    TaskTypeBreakdownJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamReports_TaskTypeBreakdown DEFAULT N'[]',
    BlockersJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamReports_Blockers DEFAULT N'[]',
    RecommendationsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamReports_Recommendations DEFAULT N'[]',
    XpAwarded INT NOT NULL CONSTRAINT DF_ExamReports_XpAwarded DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamReports_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ExamReports PRIMARY KEY (Id),
    CONSTRAINT FK_ExamReports_Session FOREIGN KEY (SessionId) REFERENCES dbo.ExamSessions (Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ExamReports_Session UNIQUE (SessionId),
    CONSTRAINT CK_ExamReports_Mode CHECK (Mode IN (N'simulation', N'training')),
    CONSTRAINT CK_ExamReports_Level CHECK (Level IN (N'A1', N'A2', N'B1'))
  );
END
GO

IF OBJECT_ID(N'dbo.ExamReadinessSnapshots', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ExamReadinessSnapshots (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    ProfileId UNIQUEIDENTIFIER NOT NULL,
    Level NVARCHAR(8) NOT NULL,
    ReadinessState NVARCHAR(32) NOT NULL,
    Confidence NVARCHAR(16) NOT NULL,
    BlockersJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamReadiness_Blockers DEFAULT N'[]',
    StrengthsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ExamReadiness_Strengths DEFAULT N'[]',
    GeneratedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamReadiness_GeneratedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ExamReadinessSnapshots PRIMARY KEY (Id),
    CONSTRAINT FK_ExamReadiness_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_ExamReadiness_Profile FOREIGN KEY (ProfileId) REFERENCES dbo.ExamProfiles (Id),
    CONSTRAINT CK_ExamReadiness_Level CHECK (Level IN (N'A1', N'A2', N'B1'))
  );
  CREATE INDEX IX_ExamReadiness_User_Profile_Level_Generated
    ON dbo.ExamReadinessSnapshots (UserId, ProfileId, Level, GeneratedAt DESC);
END
GO

/* Seed canonical inburgering speaking profiles (minimal blueprints; app may hydrate richer JSON later). */
IF NOT EXISTS (SELECT 1 FROM dbo.ExamProfiles WHERE ExamCode = N'inburgering_speaking' AND Level = N'A1')
BEGIN
  INSERT INTO dbo.ExamProfiles (
    Id, ExamCode, Level, Title, Description,
    SimulationBlueprintJson, TrainingBlueprintJson, ScoringBlueprintJson,
    UiConfigJson, PassThresholdsJson, ReadinessConfigJson, SchemaVersion
  )
  VALUES
  (
    '00000000-0000-4000-8000-0000000000A1',
    N'inburgering_speaking',
    N'A1',
    N'Inburgering — Speaking (A1)',
    N'Integration exam speaking track — A1 band.',
    N'{"schemaVersion":1,"sections":[]}',
    N'{"schemaVersion":1,"sections":[]}',
    N'{"schemaVersion":1,"coreWeights":{},"strictnessSimulation":1,"leniencyTraining":1.05,"overlaysByTask":{}}',
    N'{"schemaVersion":1,"minTasksForMeaningfulXp":{"simulation":{"full":5,"section":3},"training":3}}',
    N'{"readyAbove":0.72,"borderlineAbove":0.58}',
    N'{"windowDays":30}',
    1
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ExamProfiles WHERE ExamCode = N'inburgering_speaking' AND Level = N'A2')
BEGIN
  INSERT INTO dbo.ExamProfiles (
    Id, ExamCode, Level, Title, Description,
    SimulationBlueprintJson, TrainingBlueprintJson, ScoringBlueprintJson,
    UiConfigJson, PassThresholdsJson, ReadinessConfigJson, SchemaVersion
  )
  VALUES
  (
    '00000000-0000-4000-8000-0000000000A2',
    N'inburgering_speaking',
    N'A2',
    N'Inburgering — Speaking (A2)',
    N'Integration exam speaking track — A2 band.',
    N'{"schemaVersion":1,"sections":[]}',
    N'{"schemaVersion":1,"sections":[]}',
    N'{"schemaVersion":1,"coreWeights":{},"strictnessSimulation":1.05,"leniencyTraining":1.08,"overlaysByTask":{}}',
    N'{"schemaVersion":1,"minTasksForMeaningfulXp":{"simulation":{"full":5,"section":3},"training":3}}',
    N'{"readyAbove":0.72,"borderlineAbove":0.58}',
    N'{"windowDays":30}',
    1
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ExamProfiles WHERE ExamCode = N'inburgering_speaking' AND Level = N'B1')
BEGIN
  INSERT INTO dbo.ExamProfiles (
    Id, ExamCode, Level, Title, Description,
    SimulationBlueprintJson, TrainingBlueprintJson, ScoringBlueprintJson,
    UiConfigJson, PassThresholdsJson, ReadinessConfigJson, SchemaVersion
  )
  VALUES
  (
    '00000000-0000-4000-8000-0000000000B1',
    N'inburgering_speaking',
    N'B1',
    N'Inburgering — Speaking (B1)',
    N'Integration exam speaking track — B1 band.',
    N'{"schemaVersion":1,"sections":[]}',
    N'{"schemaVersion":1,"sections":[]}',
    N'{"schemaVersion":1,"coreWeights":{},"strictnessSimulation":1.08,"leniencyTraining":1.1,"overlaysByTask":{}}',
    N'{"schemaVersion":1,"minTasksForMeaningfulXp":{"simulation":{"full":5,"section":3},"training":3}}',
    N'{"readyAbove":0.75,"borderlineAbove":0.6}',
    N'{"windowDays":30}',
    1
  );
END
GO

PRINT N'044_exam_persistence applied.';
GO
