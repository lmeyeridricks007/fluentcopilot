SET NOCOUNT ON;
GO

DECLARE @OpinionsPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000025';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @OpinionsPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @OpinionsPersonaId,
    N'opinions_discussion_partner',
    N'Gesprekspartner',
    N'Neutrale gesprekspartner voor meningen: geeft een standpunt, vraagt door, lichte tegenspraak — jij oefent eens/oneens en redenen in het Nederlands.',
    N'Neutraal, licht direct, respectvol; nieuwsgierig; geen overweldigende argumenten; Nederlands.',
    N'["Stay in scenario","Dutch only to the learner","One opinion line then one question max","Light disagreement ok","No politics or sensitive topics"]',
    N'message_circle',
    N'Ik zet een mening neer — jij mag eens of oneens zijn, maar hou het vriendelijk. Wat vind jij?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Gesprekspartner',
      RoleDescription = N'Neutrale gesprekspartner voor meningen: geeft een standpunt, vraagt door, lichte tegenspraak — jij oefent eens/oneens en redenen in het Nederlands.',
      Tone = N'Neutraal, licht direct, respectvol; nieuwsgierig; geen overweldigende argumenten; Nederlands.',
      StyleRulesJson = N'["Stay in scenario","Dutch only to the learner","One opinion line then one question max","Light disagreement ok","No politics or sensitive topics"]',
      IntroLine = N'Ik zet een mening neer — jij mag eens of oneens zijn, maar hou het vriendelijk. Wat vind jij?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @OpinionsPersonaId;
END
GO

DECLARE @OpinionsScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000026';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @OpinionsScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @OpinionsScenarioId,
    N'opinions_discussions',
    N'Opinions & discussions',
    N'Geef je mening, ga eens of oneens in, en leg kort uit waarom — lichte discussie in het Nederlands, respectvol en zonder zware onderwerpen.',
    N'Jezelf',
    N'["Geef duidelijk aan of je het eens bent, oneens bent, of genuanceerd — blijf respectvol en op het onderwerp.","Geef minstens één reden of toelichting (bijv. “omdat”, “want”, “ik vind dat …”).","Houd je beurt leesbaar: kort standpunt, dan uitleg — geen persoonlijke aanval."]',
    N'["Ik ben het eens","Ik ben het niet eens","Omdat …","Ik vind dat omdat …","Dat klopt"]',
    N'A2',
    N'["speak-live","dutch","advanced","opinion","discussion"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Opinions & discussions',
      Description = N'Geef je mening, ga eens of oneens in, en leg kort uit waarom — lichte discussie in het Nederlands, respectvol en zonder zware onderwerpen.',
      UserRole = N'Jezelf',
      GoalsJson = N'["Geef duidelijk aan of je het eens bent, oneens bent, of genuanceerd — blijf respectvol en op het onderwerp.","Geef minstens één reden of toelichting (bijv. “omdat”, “want”, “ik vind dat …”).","Houd je beurt leesbaar: kort standpunt, dan uitleg — geen persoonlijke aanval."]',
      StarterSuggestionsJson = N'["Ik ben het eens","Ik ben het niet eens","Omdat …","Ik vind dat omdat …","Dat klopt"]',
      DifficultyBand = N'A2',
      TagsJson = N'["speak-live","dutch","advanced","opinion","discussion"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @OpinionsScenarioId;
END
GO

PRINT N'029_opinions_discussions_scenario complete.';
GO
