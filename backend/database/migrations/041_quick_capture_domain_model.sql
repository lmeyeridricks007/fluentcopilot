-- Domain model: CaptureItem, PlaceItem, DailyCaptureBundle, PersonalizedPracticePack (typed JSON columns)
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.UserPlaceItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserPlaceItems (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Label NVARCHAR(300) NOT NULL,
    Category NVARCHAR(120) NOT NULL,
    ScenarioTagsJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPlaceItems_CreatedAt DEFAULT SYSUTCDATETIME(),
    LastUsedAt DATETIME2 NULL,
    CONSTRAINT PK_UserPlaceItems PRIMARY KEY (Id),
    CONSTRAINT FK_UserPlaceItems_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
  );
  CREATE INDEX IX_UserPlaceItems_User_Created ON dbo.UserPlaceItems (UserId, CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.UserCaptureItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserCaptureItems (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Type NVARCHAR(32) NOT NULL,
    Status NVARCHAR(32) NOT NULL CONSTRAINT DF_UserCaptureItems_Status DEFAULT N'new',
    CaptureDate DATE NOT NULL,
    RawText NVARCHAR(MAX) NULL,
    CleanedText NVARCHAR(MAX) NULL,
    Title NVARCHAR(500) NULL,
    Description NVARCHAR(MAX) NULL,
    SourceSignalsJson NVARCHAR(MAX) NULL,
    ScenarioTagsJson NVARCHAR(MAX) NULL,
    SkillTagsJson NVARCHAR(MAX) NULL,
    DifficultyFeelingsJson NVARCHAR(MAX) NULL,
    PlaceId UNIQUEIDENTIFIER NULL,
    PlaceLabel NVARCHAR(300) NULL,
    MetadataJson NVARCHAR(MAX) NULL,
    MediaJson NVARCHAR(MAX) NULL,
    EnrichmentJson NVARCHAR(MAX) NULL,
    PracticeRefsJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserCaptureItems_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserCaptureItems_UpdatedAt DEFAULT SYSUTCDATETIME(),
    ArchivedAt DATETIME2 NULL,
    CONSTRAINT PK_UserCaptureItems PRIMARY KEY (Id),
    CONSTRAINT FK_UserCaptureItems_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_UserCaptureItems_Place FOREIGN KEY (PlaceId) REFERENCES dbo.UserPlaceItems (Id),
    CONSTRAINT CK_UserCaptureItems_Type CHECK (
      Type IN (
        N'save_word',
        N'save_phrase',
        N'photo_text',
        N'add_place',
        N'paste_text',
        N'log_struggle',
        N'voice_note'
      )
    ),
    CONSTRAINT CK_UserCaptureItems_Status CHECK (
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
  CREATE INDEX IX_UserCaptureItems_User_Date ON dbo.UserCaptureItems (UserId, CaptureDate DESC, CreatedAt DESC);
  CREATE INDEX IX_UserCaptureItems_User_Status ON dbo.UserCaptureItems (UserId, Status, UpdatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.UserDailyCaptureBundles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserDailyCaptureBundles (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    BundleDate DATE NOT NULL,
    CaptureIdsJson NVARCHAR(MAX) NOT NULL,
    ThemeClustersJson NVARCHAR(MAX) NULL,
    GeneratedPracticePackIdsJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserDailyCaptureBundles_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserDailyCaptureBundles PRIMARY KEY (Id),
    CONSTRAINT FK_UserDailyCaptureBundles_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT UX_UserDailyCaptureBundles_User_Date UNIQUE (UserId, BundleDate)
  );
END
GO

IF OBJECT_ID(N'dbo.UserPersonalizedPracticePacks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserPersonalizedPracticePacks (
    Id UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    PackDate DATE NOT NULL,
    SourceCaptureIdsJson NVARCHAR(MAX) NOT NULL,
    ClusterIdsJson NVARCHAR(MAX) NULL,
    Title NVARCHAR(300) NOT NULL,
    Subtitle NVARCHAR(600) NOT NULL,
    EstimatedMinutes INT NOT NULL CONSTRAINT DF_UserPersonalizedPracticePacks_EstM DEFAULT 8,
    Level NVARCHAR(16) NOT NULL CONSTRAINT DF_UserPersonalizedPracticePacks_Level DEFAULT N'A2',
    ItemsJson NVARCHAR(MAX) NOT NULL,
    XpPotential INT NOT NULL CONSTRAINT DF_UserPersonalizedPracticePacks_Xp DEFAULT 20,
    Status NVARCHAR(24) NOT NULL CONSTRAINT DF_UserPersonalizedPracticePacks_Status DEFAULT N'ready',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPersonalizedPracticePacks_CreatedAt DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    CONSTRAINT PK_UserPersonalizedPracticePacks PRIMARY KEY (Id),
    CONSTRAINT FK_UserPersonalizedPracticePacks_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_UserPersonalizedPracticePacks_Status CHECK (
      Status IN (N'ready', N'started', N'completed', N'archived')
    )
  );
  CREATE INDEX IX_UserPersonalizedPracticePacks_User_Date
    ON dbo.UserPersonalizedPracticePacks (UserId, PackDate DESC, CreatedAt DESC);
END
GO

PRINT N'041_quick_capture_domain_model applied.';
GO
