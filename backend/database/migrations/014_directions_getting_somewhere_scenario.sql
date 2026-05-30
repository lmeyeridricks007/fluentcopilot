SET NOCOUNT ON;
GO

DECLARE @DirectionsPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000007';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @DirectionsPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @DirectionsPersonaId,
    N'directions_helper',
    N'Iemand ter plaatse',
    N'Passant, stationsmedewerker, receptionist of lokale — korte, natuurlijke wegwijs-hulp in het Nederlands.',
    N'Praktisch Nederlands; korte antwoorden; geen les geven tijdens het gesprek.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
    N'map',
    N'Hallo, kan ik u de weg wijzen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Iemand ter plaatse',
      RoleDescription = N'Passant, stationsmedewerker, receptionist of lokale — korte, natuurlijke wegwijs-hulp in het Nederlands.',
      Tone = N'Praktisch Nederlands; korte antwoorden; geen les geven tijdens het gesprek.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
      IntroLine = N'Hallo, kan ik u de weg wijzen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @DirectionsPersonaId;
END
GO

DECLARE @DirectionsScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000008';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @DirectionsScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @DirectionsScenarioId,
    N'directions_getting_somewhere',
    N'Directions / getting somewhere',
    N'You start in Dutch: ask how to get somewhere, say where you need to go, or summarize the route. The assistant only speaks after you do — short Dutch replies. Follow the on-screen situation.',
    N'Pedestrian',
    N'["Vraag duidelijk waar of hoe u ergens komt.","Noem de bestemming duidelijk.","Gebruik een beleefde of directe opening.","Bevestig of stel een korte vervolgvraag."]',
    N'["Waar is het station?","Hoe kom ik bij het centrum?","Kunt u dat herhalen?","Dus eerst rechtdoor en dan links?"]',
    N'A2',
    N'["directions","navigation","street","real-life","getting around"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Directions / getting somewhere',
      Description = N'You start in Dutch: ask how to get somewhere, say where you need to go, or summarize the route. The assistant only speaks after you do — short Dutch replies. Follow the on-screen situation.',
      UserRole = N'Pedestrian',
      GoalsJson = N'["Vraag duidelijk waar of hoe u ergens komt.","Noem de bestemming duidelijk.","Gebruik een beleefde of directe opening.","Bevestig of stel een korte vervolgvraag."]',
      StarterSuggestionsJson = N'["Waar is het station?","Hoe kom ik bij het centrum?","Kunt u dat herhalen?","Dus eerst rechtdoor en dan links?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["directions","navigation","street","real-life","getting around"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @DirectionsScenarioId;
END
GO

PRINT N'014_directions_getting_somewhere_scenario complete.';
GO
