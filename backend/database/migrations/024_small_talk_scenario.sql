SET NOCOUNT ON;
GO

DECLARE @SmallTalkPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000015';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @SmallTalkPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @SmallTalkPersonaId,
    N'small_talk_partner',
    N'Iemand om mee te praten',
    N'Informele gesprekspartner voor small talk in het Nederlands — kantoor, café, buiten, sportschool of kennismaking (taaloefening).',
    N'Luchtig, casual, licht Nederlands-realistisch; niet overdreven enthousiast; geen docent — gewoon even praten.',
    N'["Stay in scenario","Dutch only to the learner","Short turns — social not transactional","Light follow-ups","Accept imperfect learner Dutch warmly"]',
    N'coffee',
    N'Hoi — leuk even te kletsen. Hoe is je dag tot nu toe?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Iemand om mee te praten',
      RoleDescription = N'Informele gesprekspartner voor small talk in het Nederlands — kantoor, café, buiten, sportschool of kennismaking (taaloefening).',
      Tone = N'Luchtig, casual, licht Nederlands-realistisch; niet overdreven enthousiast; geen docent — gewoon even praten.',
      StyleRulesJson = N'["Stay in scenario","Dutch only to the learner","Short turns — social not transactional","Light follow-ups","Accept imperfect learner Dutch warmly"]',
      IntroLine = N'Hoi — leuk even te kletsen. Hoe is je dag tot nu toe?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @SmallTalkPersonaId;
END
GO

DECLARE @SmallTalkScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000016';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @SmallTalkScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @SmallTalkScenarioId,
    N'small_talk',
    N'Small talk',
    N'Natuurlijke Nederlandse small talk: iemand ontmoeten, weekend, of weer — laagdrempelig, zonder checklist-stress.',
    N'Jezelf',
    N'["Blijf in het gesprek — korte reacties zijn prima.","Reageer natuurlijk (oh leuk, interessant, even doorvragen).","Stel een kleine vervolgvraag of maak een zachte brug naar iets nieuws."]',
    N'["Hoi, ik ben …","Leuk je te ontmoeten.","Hoe was je weekend?","Wat heb je dit weekend gedaan?","Het is lekker weer vandaag.","Het regent weer — typisch hè?","En jij — hoe gaat het?","Wat ga je nog doen vandaag?"]',
    N'A2',
    N'["small-talk","social","everyday","confidence","speak-live","dutch"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Small talk',
      Description = N'Natuurlijke Nederlandse small talk: iemand ontmoeten, weekend, of weer — laagdrempelig, zonder checklist-stress.',
      UserRole = N'Jezelf',
      GoalsJson = N'["Blijf in het gesprek — korte reacties zijn prima.","Reageer natuurlijk (oh leuk, interessant, even doorvragen).","Stel een kleine vervolgvraag of maak een zachte brug naar iets nieuws."]',
      StarterSuggestionsJson = N'["Hoi, ik ben …","Leuk je te ontmoeten.","Hoe was je weekend?","Wat heb je dit weekend gedaan?","Het is lekker weer vandaag.","Het regent weer — typisch hè?","En jij — hoe gaat het?","Wat ga je nog doen vandaag?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["small-talk","social","everyday","confidence","speak-live","dutch"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @SmallTalkScenarioId;
END
GO

PRINT N'024_small_talk_scenario complete.';
GO
