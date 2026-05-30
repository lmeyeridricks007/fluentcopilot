SET NOCOUNT ON;
GO

DECLARE @ExplainPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000021';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @ExplainPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @ExplainPersonaId,
    N'explaining_something_listener',
    N'Iemand die meeluistert',
    N'Luisteraar in een taaloefening: vraagt kort om verduidelijking — jij oefent helder uitleggen in het Nederlands.',
    N'Geduldig, nieuwsgierig, korte zinnen; geen docent; lichte wrijving om structuur te scherpen.',
    N'["Stay in scenario","Dutch only to the learner","Listener role","One clarification question per turn after explanation","Do not dominate"]',
    N'users',
    N'Oké — ik luister. Leg maar uit; als iets onduidelijk is, vraag ik het straks even door.'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Iemand die meeluistert',
      RoleDescription = N'Luisteraar in een taaloefening: vraagt kort om verduidelijking — jij oefent helder uitleggen in het Nederlands.',
      Tone = N'Geduldig, nieuwsgierig, korte zinnen; geen docent; lichte wrijving om structuur te scherpen.',
      StyleRulesJson = N'["Stay in scenario","Dutch only to the learner","Listener role","One clarification question per turn after explanation","Do not dominate"]',
      IntroLine = N'Oké — ik luister. Leg maar uit; als iets onduidelijk is, vraag ik het straks even door.',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @ExplainPersonaId;
END
GO

DECLARE @ExplainScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000022';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @ExplainScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @ExplainScenarioId,
    N'explaining_something',
    N'Explaining something',
    N'Leg iets duidelijk uit in het Nederlands: instructies, een proces, of een how-to — met structuur en verbindingswoorden.',
    N'Jezelf',
    N'["Leg uit met een duidelijke volgorde — stappen en logische volgorde.","Noem genoeg relevante stappen — niet te kort, niet eindeloos.","Reageer ook op verduidelijkingsvragen — blijf helder en rustig."]',
    N'["Eerst …","Daarna …","Dan …","Tot slot …","Zet eerst …","Klik dan op …"]',
    N'A2',
    N'["speak-live","dutch","advanced","explain","structure"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Explaining something',
      Description = N'Leg iets duidelijk uit in het Nederlands: instructies, een proces, of een how-to — met structuur en verbindingswoorden.',
      UserRole = N'Jezelf',
      GoalsJson = N'["Leg uit met een duidelijke volgorde — stappen en logische volgorde.","Noem genoeg relevante stappen — niet te kort, niet eindeloos.","Reageer ook op verduidelijkingsvragen — blijf helder en rustig."]',
      StarterSuggestionsJson = N'["Eerst …","Daarna …","Dan …","Tot slot …","Zet eerst …","Klik dan op …"]',
      DifficultyBand = N'A2',
      TagsJson = N'["speak-live","dutch","advanced","explain","structure"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @ExplainScenarioId;
END
GO

PRINT N'027_explaining_something_scenario complete.';
GO
