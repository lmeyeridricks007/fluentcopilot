/*
  FluentCopilot — Azure SQL initial schema (Feature 1 + extension points)
  Run against dev database after creating empty DB. See docs/backend/database-migrations-and-seeding.md
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.Users (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ExternalId NVARCHAR(128) NOT NULL,
    Email NVARCHAR(256) NULL,
    DisplayName NVARCHAR(128) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_ExternalId UNIQUE (ExternalId)
  );
  CREATE INDEX IX_Users_UpdatedAt ON dbo.Users (UpdatedAt DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserPreferences' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.UserPreferences (
    UserId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UserPreferences PRIMARY KEY,
    PreferencesJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_UserPreferences_Json DEFAULT N'{}',
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPreferences_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_UserPreferences_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ScenarioDefinitions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.ScenarioDefinitions (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ScenarioDefinitions PRIMARY KEY,
    Slug NVARCHAR(64) NOT NULL,
    Title NVARCHAR(256) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    UserRole NVARCHAR(128) NOT NULL,
    GoalsJson NVARCHAR(MAX) NOT NULL,
    StarterSuggestionsJson NVARCHAR(MAX) NOT NULL,
    DifficultyBand NVARCHAR(16) NOT NULL,
    TagsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Scenario_Tags DEFAULT N'[]',
    AllowedModesJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Scenario_Modes DEFAULT N'["guided","free"]',
    OpeningMessage NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Scenario_Active DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Scenario_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Scenario_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ScenarioDefinitions_Slug UNIQUE (Slug)
  );
  CREATE INDEX IX_ScenarioDefinitions_Active ON dbo.ScenarioDefinitions (IsActive, Slug);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PersonaDefinitions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.PersonaDefinitions (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PersonaDefinitions PRIMARY KEY,
    Slug NVARCHAR(64) NOT NULL,
    DisplayName NVARCHAR(128) NOT NULL,
    RoleDescription NVARCHAR(256) NOT NULL,
    Tone NVARCHAR(512) NOT NULL,
    StyleRulesJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Persona_Style DEFAULT N'[]',
    AvatarKey NVARCHAR(64) NULL,
    IntroLine NVARCHAR(MAX) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Persona_Active DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Persona_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Persona_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_PersonaDefinitions_Slug UNIQUE (Slug)
  );
  CREATE INDEX IX_PersonaDefinitions_Active ON dbo.PersonaDefinitions (IsActive, Slug);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConversationThreads' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.ConversationThreads (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ConversationThreads PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    ScenarioId UNIQUEIDENTIFIER NOT NULL,
    PersonaId UNIQUEIDENTIFIER NOT NULL,
    Mode NVARCHAR(32) NOT NULL,
    FeedbackMode NVARCHAR(32) NOT NULL,
    Status NVARCHAR(32) NOT NULL,
    SummaryText NVARCHAR(MAX) NULL,
    CurrentStage NVARCHAR(64) NULL,
    LastUserMessageAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Thread_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Thread_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Threads_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_Threads_Scenario FOREIGN KEY (ScenarioId) REFERENCES dbo.ScenarioDefinitions (Id),
    CONSTRAINT FK_Threads_Persona FOREIGN KEY (PersonaId) REFERENCES dbo.PersonaDefinitions (Id),
    CONSTRAINT CK_Threads_Mode CHECK (Mode IN (N'guided', N'free')),
    CONSTRAINT CK_Threads_FeedbackMode CHECK (FeedbackMode IN (N'turn', N'end')),
    CONSTRAINT CK_Threads_Status CHECK (Status IN (N'active', N'completed', N'paused'))
  );
  CREATE INDEX IX_Threads_User_Status ON dbo.ConversationThreads (UserId, Status, UpdatedAt DESC);
  CREATE INDEX IX_Threads_User_Scenario_Active ON dbo.ConversationThreads (UserId, ScenarioId, Status);
  CREATE INDEX IX_Threads_UpdatedAt ON dbo.ConversationThreads (UpdatedAt DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConversationMessages' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.ConversationMessages (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ConversationMessages PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ThreadId UNIQUEIDENTIFIER NOT NULL,
    SenderType NVARCHAR(32) NOT NULL,
    MessageType NVARCHAR(32) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    MetadataJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Msg_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Messages_Thread FOREIGN KEY (ThreadId) REFERENCES dbo.ConversationThreads (Id) ON DELETE CASCADE,
    CONSTRAINT CK_Messages_Sender CHECK (SenderType IN (N'user', N'assistant', N'system', N'coach')),
    CONSTRAINT CK_Messages_Type CHECK (MessageType IN (N'text', N'system_banner'))
  );
  CREATE INDEX IX_Messages_Thread_Created ON dbo.ConversationMessages (ThreadId, CreatedAt ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'FeedbackItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.FeedbackItems (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FeedbackItems PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ThreadId UNIQUEIDENTIFIER NOT NULL,
    LinkedMessageId UNIQUEIDENTIFIER NOT NULL,
    Category NVARCHAR(32) NOT NULL,
    OriginalText NVARCHAR(MAX) NOT NULL,
    CorrectedText NVARCHAR(MAX) NOT NULL,
    Explanation NVARCHAR(MAX) NOT NULL,
    Severity NVARCHAR(16) NOT NULL CONSTRAINT DF_Feedback_Severity DEFAULT N'info',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Feedback_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Feedback_Thread FOREIGN KEY (ThreadId) REFERENCES dbo.ConversationThreads (Id) ON DELETE CASCADE
    /* LinkedMessageId is a logical reference to ConversationMessages.Id (no FK — avoids cascade graphs on thread purge). */
  );
  CREATE INDEX IX_Feedback_Thread ON dbo.FeedbackItems (ThreadId, CreatedAt ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SavedWords' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.SavedWords (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SavedWords PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Text NVARCHAR(512) NOT NULL,
    NormalizedText NVARCHAR(512) NOT NULL,
    Meaning NVARCHAR(512) NULL,
    SourceType NVARCHAR(32) NOT NULL,
    SourceThreadId UNIQUEIDENTIFIER NULL,
    SourceMessageId UNIQUEIDENTIFIER NULL,
    SourceScenarioId UNIQUEIDENTIFIER NULL,
    ExampleSentence NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SavedWords_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_SavedWords_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_SavedWords_Thread FOREIGN KEY (SourceThreadId) REFERENCES dbo.ConversationThreads (Id)
  );
  CREATE INDEX IX_SavedWords_User_Created ON dbo.SavedWords (UserId, CreatedAt DESC);
  CREATE INDEX IX_SavedWords_User_Normalized ON dbo.SavedWords (UserId, NormalizedText);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSignalEvents' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.UserSignalEvents (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UserSignalEvents PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    EventType NVARCHAR(64) NOT NULL,
    PayloadJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Signal_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Signals_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
  );
  CREATE INDEX IX_Signals_User_Created ON dbo.UserSignalEvents (UserId, CreatedAt DESC);
END
GO

PRINT N'001_initial_schema applied (idempotent checks).';
GO
