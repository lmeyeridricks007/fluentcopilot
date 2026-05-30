SET NOCOUNT ON;
GO

DECLARE @HousingPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000011';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @HousingPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @HousingPersonaId,
    N'housing_contact_staff',
    N'Verhuurder',
    N'Verhuurder, makelaar of gebouwbeheer — korte, praktische huis- en huurafstemming (taaloefening).',
    N'Praktisch Nederlands; één vraag per beurt; geen les midden in het gesprek; blijf in-scène; geen juridisch advies.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
    N'home',
    N'Dag — u belt over de woning. Waar kan ik u mee helpen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Verhuurder',
      RoleDescription = N'Verhuurder, makelaar of gebouwbeheer — korte, praktische huis- en huurafstemming (taaloefening).',
      Tone = N'Praktisch Nederlands; één vraag per beurt; geen les midden in het gesprek; blijf in-scène; geen juridisch advies.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
      IntroLine = N'Dag — u belt over de woning. Waar kan ik u mee helpen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @HousingPersonaId;
END
GO

DECLARE @HousingScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000012';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @HousingScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @HousingScenarioId,
    N'housing_landlord',
    N'Housing / landlord',
    N'Meld een probleem in je woning of stel praktische vragen over huur en contract — verhuurder, makelaar of gebouwbeheer (taaloefening).',
    N'Huurder',
    N'["Zeg duidelijk wat er in de woning mis is.","Gebruik begrijpelijke woorden voor woning of reparatie.","Vraag om hulp of actie (wat kan er gebeuren?).","Bevestig de volgende stap of vraag naar timing."]',
    N'["De verwarming werkt niet.","Er is een lek in de keuken.","De douche is kapot.","Kunt u iemand sturen?","Wanneer moet ik de huur betalen?","Hoe lang is het contract?","Hoe werkt de opzegtermijn?","Krijg ik de borg terug?","Er is schimmel.","Wasmachine werkt niet."]',
    N'A2',
    N'["housing","landlord","rent","repair","contract","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Housing / landlord',
      Description = N'Meld een probleem in je woning of stel praktische vragen over huur en contract — verhuurder, makelaar of gebouwbeheer (taaloefening).',
      UserRole = N'Huurder',
      GoalsJson = N'["Zeg duidelijk wat er in de woning mis is.","Gebruik begrijpelijke woorden voor woning of reparatie.","Vraag om hulp of actie (wat kan er gebeuren?).","Bevestig de volgende stap of vraag naar timing."]',
      StarterSuggestionsJson = N'["De verwarming werkt niet.","Er is een lek in de keuken.","De douche is kapot.","Kunt u iemand sturen?","Wanneer moet ik de huur betalen?","Hoe lang is het contract?","Hoe werkt de opzegtermijn?","Krijg ik de borg terug?","Er is schimmel.","Wasmachine werkt niet."]',
      DifficultyBand = N'A2',
      TagsJson = N'["housing","landlord","rent","repair","contract","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @HousingScenarioId;
END
GO

PRINT N'020_housing_landlord_scenario complete.';
GO
