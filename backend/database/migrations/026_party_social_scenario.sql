SET NOCOUNT ON;
GO

DECLARE @PartyPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000019';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @PartyPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @PartyPersonaId,
    N'party_social_partner',
    N'Iemand op het feest',
    N'Gesprekspartner op een feest, borrel of netwerkavond — korte dynamische sociale wissels (taaloefening).',
    N'Informeel, licht energiek, licht Nederlands-ingetoogen; nieuwsgierig; geen docent.',
    N'["Stay in scenario","Dutch only to the learner","Short bursts","Topic shifts ok","Light friction ok"]',
    N'users',
    N'Hé — gezellig hier. Hoe ken jij de host?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Iemand op het feest',
      RoleDescription = N'Gesprekspartner op een feest, borrel of netwerkavond — korte dynamische sociale wissels (taaloefening).',
      Tone = N'Informeel, licht energiek, licht Nederlands-ingetoogen; nieuwsgierig; geen docent.',
      StyleRulesJson = N'["Stay in scenario","Dutch only to the learner","Short bursts","Topic shifts ok","Light friction ok"]',
      IntroLine = N'Hé — gezellig hier. Hoe ken jij de host?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @PartyPersonaId;
END
GO

DECLARE @PartyScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000020';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @PartyScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @PartyScenarioId,
    N'party_social',
    N'At a party / social setting',
    N'Korte, levendige gesprekken op een feest of sociale setting: reageren, vragen stellen, en het gesprek laten stromen — minder lineair dan andere scenario’s.',
    N'Jezelf',
    N'["Houd het feestgesprek in beweging — korte reacties, mini-opmerkingen, geen lange stilte.","Stel natuurlijke feest-/netwerkvragen en toon echte nieuwsgierigheid.","Laat het licht springen — soms van onderwerp wisselen; blijf menselijk (geen interview)."]',
    N'["Oh echt?","Leuk!","Nice!","En verder?","Wat doe jij hier?","Ken je veel mensen hier?","Hoe ken je de host?"]',
    N'A2',
    N'["social","party","speak-live","dutch","networking"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'At a party / social setting',
      Description = N'Korte, levendige gesprekken op een feest of sociale setting: reageren, vragen stellen, en het gesprek laten stromen — minder lineair dan andere scenario’s.',
      UserRole = N'Jezelf',
      GoalsJson = N'["Houd het feestgesprek in beweging — korte reacties, mini-opmerkingen, geen lange stilte.","Stel natuurlijke feest-/netwerkvragen en toon echte nieuwsgierigheid.","Laat het licht springen — soms van onderwerp wisselen; blijf menselijk (geen interview)."]',
      StarterSuggestionsJson = N'["Oh echt?","Leuk!","Nice!","En verder?","Wat doe jij hier?","Ken je veel mensen hier?","Hoe ken je de host?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["social","party","speak-live","dutch","networking"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @PartyScenarioId;
END
GO

PRINT N'026_party_social_scenario complete.';
GO
