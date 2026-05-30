SET NOCOUNT ON;
GO

DECLARE @LanguageCoachPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000027';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @LanguageCoachPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @LanguageCoachPersonaId,
    N'language_coach_partner',
    N'Jouw taalcoach',
    N'Geduldige Nederlandse gesprekspartner en coach — vrije conversatie, subtiele steun, geen constante onderbreking.',
    N'Warm, helder, natuurlijk Nederlands; korte zinnen op A1–A2; iets rijker op B1+; nooit prekerig.',
    N'["Dutch only to the learner in assistantReply","Implicit recasts allowed inside natural replies","Remember what the learner said this session","One follow-up question is OK","Do not list grammar rules aloud","Confidence over nitpicking"]',
    N'coach',
    N'Hoi! Ik ben je coach vandaag — waar zin je het over te hebben?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Jouw taalcoach',
      RoleDescription = N'Geduldige Nederlandse gesprekspartner en coach — vrije conversatie, subtiele steun, geen constante onderbreking.',
      Tone = N'Warm, helder, natuurlijk Nederlands; korte zinnen op A1–A2; iets rijker op B1+; nooit prekerig.',
      StyleRulesJson = N'["Dutch only to the learner in assistantReply","Implicit recasts allowed inside natural replies","Remember what the learner said this session","One follow-up question is OK","Do not list grammar rules aloud","Confidence over nitpicking"]',
      IntroLine = N'Hoi! Ik ben je coach vandaag — waar zin je het over te hebben?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @LanguageCoachPersonaId;
END
GO

DECLARE @LanguageCoachScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000028';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @LanguageCoachScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @LanguageCoachScenarioId,
    N'language_coach',
    N'Language Coach',
    N'Vrije conversatie in het Nederlands met een adaptieve coach: subtiele duwtjes (recast / doorvraag), zwakke patronen worden onthouden, uitgebreide feedback na afloop.',
    N'Jezelf',
    N'[]',
    N'["Ik wil gewoon even kletsen.","Vertel iets over je weekend.","Hoe gaat het met je Nederlands?","Waar werk of studeer je?","Wat vind je leuk aan Nederland?"]',
    N'B1',
    N'["language-coach","free-form","speak-live","adaptive","premium"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Language Coach',
      Description = N'Vrije conversatie in het Nederlands met een adaptieve coach: subtiele duwtjes (recast / doorvraag), zwakke patronen worden onthouden, uitgebreide feedback na afloop.',
      UserRole = N'Jezelf',
      GoalsJson = N'[]',
      StarterSuggestionsJson = N'["Ik wil gewoon even kletsen.","Vertel iets over je weekend.","Hoe gaat het met je Nederlands?","Waar werk of studeer je?","Wat vind je leuk aan Nederland?"]',
      DifficultyBand = N'B1',
      TagsJson = N'["language-coach","free-form","speak-live","adaptive","premium"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @LanguageCoachScenarioId;
END
GO

PRINT N'030_language_coach_scenario complete.';
GO
