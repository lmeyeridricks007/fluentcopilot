SET NOCOUNT ON;
GO

DECLARE @WorkColleaguePersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-00000000000F';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @WorkColleaguePersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @WorkColleaguePersonaId,
    N'workplace_colleague_staff',
    N'Collega',
    N'Collega of leidinggevende op kantoor — korte, professionele werkafstemming (taaloefening).',
    N'Vriendelijk-professioneel Nederlands; één vraag per beurt; geen les midden in het gesprek; blijf in-scène.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
    N'briefcase',
    N'Hoi — heb je even voor een korte werkafstemming?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Collega',
      RoleDescription = N'Collega of leidinggevende op kantoor — korte, professionele werkafstemming (taaloefening).',
      Tone = N'Vriendelijk-professioneel Nederlands; één vraag per beurt; geen les midden in het gesprek; blijf in-scène.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
      IntroLine = N'Hoi — heb je even voor een korte werkafstemming?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @WorkColleaguePersonaId;
END
GO

DECLARE @WorkColleagueScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000010';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @WorkColleagueScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @WorkColleagueScenarioId,
    N'work_colleague_interaction',
    N'Werk / collega-interactie',
    N'Korte werkpraat, om hulp vragen en taken verduidelijken — collega, team of leidinggevende (taaloefening).',
    N'Collega',
    N'["Reageer duidelijk op de werkcontext.","Houd het onderwerp of de taak duidelijk.","Stel of beantwoord één nuttige vervolgvraag.","Gebruik een natuurlijke werkplektoon."]',
    N'["Hoe gaat het met dat stuk?","Kun je mij even helpen?","Wat moet ik precies doen?","Wanneer moet dit klaar zijn?","Dus ik stuur het naar jou?"]',
    N'A2',
    N'["work","office","colleague","help","clarify","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Werk / collega-interactie',
      Description = N'Korte werkpraat, om hulp vragen en taken verduidelijken — collega, team of leidinggevende (taaloefening).',
      UserRole = N'Collega',
      GoalsJson = N'["Reageer duidelijk op de werkcontext.","Houd het onderwerp of de taak duidelijk.","Stel of beantwoord één nuttige vervolgvraag.","Gebruik een natuurlijke werkplektoon."]',
      StarterSuggestionsJson = N'["Hoe gaat het met dat stuk?","Kun je mij even helpen?","Wat moet ik precies doen?","Wanneer moet dit klaar zijn?","Dus ik stuur het naar jou?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["work","office","colleague","help","clarify","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @WorkColleagueScenarioId;
END
GO

PRINT N'019_work_colleague_interaction_scenario complete.';
GO
