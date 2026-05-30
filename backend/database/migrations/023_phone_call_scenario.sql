SET NOCOUNT ON;
GO

DECLARE @PhonePersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000013';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @PhonePersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @PhonePersonaId,
    N'phone_line_staff',
    N'Telefoonlijn',
    N'Balie, planning of klantenservice aan de lijn — korte, realistische telefoon-Nederlands (taaloefening).',
    N'Telefonisch Nederlands; iets vlotter tempo dan chat; één vraag per beurt; geen les midden in het gesprek; blijf in-scène.',
    N'["Stay in scenario","Phone register — short clauses","Accept repair phrases warmly","Dutch only to the learner"]',
    N'phone',
    N'Goedemiddag — waarmee kan ik u helpen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Telefoonlijn',
      RoleDescription = N'Balie, planning of klantenservice aan de lijn — korte, realistische telefoon-Nederlands (taaloefening).',
      Tone = N'Telefonisch Nederlands; iets vlotter tempo dan chat; één vraag per beurt; geen les midden in het gesprek; blijf in-scène.',
      StyleRulesJson = N'["Stay in scenario","Phone register — short clauses","Accept repair phrases warmly","Dutch only to the learner"]',
      IntroLine = N'Goedemiddag — waarmee kan ik u helpen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @PhonePersonaId;
END
GO

DECLARE @PhoneScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000014';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @PhoneScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @PhoneScenarioId,
    N'phone_call',
    N'Phone call',
    N'Oefen echte Nederlandse telefoongesprekken zonder visuele steun: luisteren, kort antwoorden, en herstellen als iets onduidelijk is.',
    N'Beller',
    N'["Open de telefoon: stel jezelf kort voor en zeg waarom je belt.","Beantwoord vragen kort en duidelijk — blijf bij het doel van het gesprek.","Herstel het gesprek: vraag om herhaling, bevestig wat je hoorde, of vraag om langzamer te praten.","Sluit netjes af: bevestig een detail of bedank en hang op."]',
    N'["Goedemiddag, met Lee.","Ik bel over een afspraak.","Ik wil graag informatie.","Ik heb een vraag over de openingstijden.","Sorry, kunt u dat herhalen?","Bedoelt u morgen of vandaag?","Kunt u langzamer praten?","Dus het is om tien uur — klopt dat?"]',
    N'A2',
    N'["phone","telephone","listening","repair","advanced","speak-live"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Phone call',
      Description = N'Oefen echte Nederlandse telefoongesprekken zonder visuele steun: luisteren, kort antwoorden, en herstellen als iets onduidelijk is.',
      UserRole = N'Beller',
      GoalsJson = N'["Open de telefoon: stel jezelf kort voor en zeg waarom je belt.","Beantwoord vragen kort en duidelijk — blijf bij het doel van het gesprek.","Herstel het gesprek: vraag om herhaling, bevestig wat je hoorde, of vraag om langzamer te praten.","Sluit netjes af: bevestig een detail of bedank en hang op."]',
      StarterSuggestionsJson = N'["Goedemiddag, met Lee.","Ik bel over een afspraak.","Ik wil graag informatie.","Ik heb een vraag over de openingstijden.","Sorry, kunt u dat herhalen?","Bedoelt u morgen of vandaag?","Kunt u langzamer praten?","Dus het is om tien uur — klopt dat?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["phone","telephone","listening","repair","advanced","speak-live"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @PhoneScenarioId;
END
GO

PRINT N'023_phone_call_scenario complete.';
GO
