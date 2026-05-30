SET NOCOUNT ON;
GO

DECLARE @RetailServicePersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-00000000000D';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @RetailServicePersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @RetailServicePersonaId,
    N'retail_service_staff',
    N'Medewerker',
    N'Winkel- of servicebalie — retour, klacht of defect: korte, natuurlijke hulp (taaloefening).',
    N'Rustig, praktisch Nederlands; één vraag per beurt; geen les midden in het gesprek; blijf in-scène.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
    N'shopping_bag',
    N'Goedemiddag — waarmee kan ik u helpen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Medewerker',
      RoleDescription = N'Winkel- of servicebalie — retour, klacht of defect: korte, natuurlijke hulp (taaloefening).',
      Tone = N'Rustig, praktisch Nederlands; één vraag per beurt; geen les midden in het gesprek; blijf in-scène.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
      IntroLine = N'Goedemiddag — waarmee kan ik u helpen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @RetailServicePersonaId;
END
GO

DECLARE @StoreServiceScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-00000000000E';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @StoreServiceScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @StoreServiceScenarioId,
    N'store_service_issue',
    N'Probleem in de winkel / service',
    N'Leg een probleem uit, vraag om hulp, en reageer duidelijk — retour, klacht of defect (taaloefening).',
    N'Klant',
    N'["Zeg duidelijk wat u wilt (retour, klacht of defect).","Leg kort uit wat er aan de hand is.","Vraag wat er mogelijk is: ruilen, terugbetaling of een oplossing.","Reageer beleefd en natuurlijk op de medewerker."]',
    N'["Ik wil dit graag terugbrengen.","Het is te klein.","Er is iets misgegaan.","Het werkt niet.","Wat kan ik nu doen?"]',
    N'A2',
    N'["store","service","return","complaint","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Probleem in de winkel / service',
      Description = N'Leg een probleem uit, vraag om hulp, en reageer duidelijk — retour, klacht of defect (taaloefening).',
      UserRole = N'Klant',
      GoalsJson = N'["Zeg duidelijk wat u wilt (retour, klacht of defect).","Leg kort uit wat er aan de hand is.","Vraag wat er mogelijk is: ruilen, terugbetaling of een oplossing.","Reageer beleefd en natuurlijk op de medewerker."]',
      StarterSuggestionsJson = N'["Ik wil dit graag terugbrengen.","Het is te klein.","Er is iets misgegaan.","Het werkt niet.","Wat kan ik nu doen?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["store","service","return","complaint","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @StoreServiceScenarioId;
END
GO

PRINT N'018_store_service_issue_scenario complete.';
GO
