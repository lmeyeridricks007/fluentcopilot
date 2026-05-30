SET NOCOUNT ON;
GO

DECLARE @StoryPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000023';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @StoryPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @StoryPersonaId,
    N'storytelling_listener',
    N'Iemand die graag luistert',
    N'Geïnteresseerde luisteraar in een taaloefening: stelt korte vervolgvragen — jij oefent verhalen vertellen in het Nederlands.',
    N'Warm, nieuwsgierig, natuurlijke mini-reacties; geen docent; lichte wrijving voor detail en gevoel.',
    N'["Stay in scenario","Dutch only to the learner","Listener role","One follow-up question per turn after a story chunk","Encourage narrative arc"]',
    N'sparkles',
    N'Leuk — vertel maar. Ik luister; als ik iets niet snap of meer wil horen, vraag ik het zo meteen even.'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Iemand die graag luistert',
      RoleDescription = N'Geïnteresseerde luisteraar in een taaloefening: stelt korte vervolgvragen — jij oefent verhalen vertellen in het Nederlands.',
      Tone = N'Warm, nieuwsgierig, natuurlijke mini-reacties; geen docent; lichte wrijving voor detail en gevoel.',
      StyleRulesJson = N'["Stay in scenario","Dutch only to the learner","Listener role","One follow-up question per turn after a story chunk","Encourage narrative arc"]',
      IntroLine = N'Leuk — vertel maar. Ik luister; als ik iets niet snap of meer wil horen, vraag ik het zo meteen even.',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @StoryPersonaId;
END
GO

DECLARE @StoryScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000024';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @StoryScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @StoryScenarioId,
    N'storytelling',
    N'Storytelling',
    N'Vertel verhalen in het Nederlands over ervaringen uit het verleden, dagelijks leven of reizen — met begin, midden en slot.',
    N'Jezelf',
    N'["Begin met wanneer/waar of de setting — het begin van je verhaal.","Vertel wat er gebeurde — middenstuk met minstens twee momenten of details.","Sluit af met een gevolg of gevoel — einde van je verhaal."]',
    N'["Gisteren …","Toen …","Daarna …","Het was …","Ik vond het …"]',
    N'A2',
    N'["speak-live","dutch","advanced","story","narrative"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Storytelling',
      Description = N'Vertel verhalen in het Nederlands over ervaringen uit het verleden, dagelijks leven of reizen — met begin, midden en slot.',
      UserRole = N'Jezelf',
      GoalsJson = N'["Begin met wanneer/waar of de setting — het begin van je verhaal.","Vertel wat er gebeurde — middenstuk met minstens twee momenten of details.","Sluit af met een gevolg of gevoel — einde van je verhaal."]',
      StarterSuggestionsJson = N'["Gisteren …","Toen …","Daarna …","Het was …","Ik vond het …"]',
      DifficultyBand = N'A2',
      TagsJson = N'["speak-live","dutch","advanced","story","narrative"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @StoryScenarioId;
END
GO

PRINT N'028_storytelling_scenario complete.';
GO
