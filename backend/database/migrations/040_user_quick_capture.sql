-- Quick Capture → From your day practice (FluentCopilot)
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.UserDayPracticePacks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserDayPracticePacks (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    LocalDate DATE NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    StepsJson NVARCHAR(MAX) NOT NULL,
    CaptureIdsJson NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(24) NOT NULL
      CONSTRAINT DF_UserDayPracticePacks_Status DEFAULT N'active',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserDayPracticePacks_CreatedAt DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    CONSTRAINT PK_UserDayPracticePacks PRIMARY KEY (Id),
    CONSTRAINT FK_UserDayPracticePacks_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_UserDayPracticePacks_PackStatus CHECK (Status IN (N'active', N'completed', N'abandoned'))
  );
  CREATE INDEX IX_UserDayPracticePacks_User_LocalDate
    ON dbo.UserDayPracticePacks (UserId, LocalDate DESC, CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.UserQuickCaptures', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserQuickCaptures (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    CaptureType NVARCHAR(32) NOT NULL,
    Status NVARCHAR(32) NOT NULL
      CONSTRAINT DF_UserQuickCaptures_Status DEFAULT N'new',
    Title NVARCHAR(500) NULL,
    BodyPrimary NVARCHAR(MAX) NULL,
    BodySecondary NVARCHAR(MAX) NULL,
    EnrichedJson NVARCHAR(MAX) NULL,
    RawJson NVARCHAR(MAX) NULL,
    LocalCaptureDate DATE NOT NULL,
    PlaceKind NVARCHAR(64) NULL,
    ImageMime NVARCHAR(120) NULL,
    Transcript NVARCHAR(MAX) NULL,
    DayPackId UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserQuickCaptures_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserQuickCaptures_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserQuickCaptures PRIMARY KEY (Id),
    CONSTRAINT FK_UserQuickCaptures_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_UserQuickCaptures_DayPack FOREIGN KEY (DayPackId) REFERENCES dbo.UserDayPracticePacks (Id),
    CONSTRAINT CK_UserQuickCaptures_Type CHECK (
      CaptureType IN (
        N'save_word',
        N'save_phrase',
        N'photo_text',
        N'add_place',
        N'paste_text',
        N'log_struggle',
        N'voice_note'
      )
    ),
    CONSTRAINT CK_UserQuickCaptures_Status CHECK (
      Status IN (
        N'new',
        N'enriched',
        N'ready_for_practice',
        N'included_in_practice',
        N'practiced',
        N'saved_long_term',
        N'archived'
      )
    )
  );
  CREATE INDEX IX_UserQuickCaptures_User_LocalDate
    ON dbo.UserQuickCaptures (UserId, LocalCaptureDate DESC, CreatedAt DESC);
  CREATE INDEX IX_UserQuickCaptures_User_Status
    ON dbo.UserQuickCaptures (UserId, Status, UpdatedAt DESC);
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_SessionLearningInsights_SessionType'
    AND parent_object_id = OBJECT_ID(N'dbo.SessionLearningInsights', N'U')
)
BEGIN
  ALTER TABLE dbo.SessionLearningInsights DROP CONSTRAINT CK_SessionLearningInsights_SessionType;
END
GO

ALTER TABLE dbo.SessionLearningInsights
  ADD CONSTRAINT CK_SessionLearningInsights_SessionType CHECK (
    SessionType IN (
      N'speak_live',
      N'text_conversation',
      N'read_aloud',
      N'listening',
      N'quick_capture'
    )
  );
GO

PRINT N'040_user_quick_capture applied.';
GO
