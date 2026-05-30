SET NOCOUNT ON;
GO

DECLARE @HealthPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-00000000000B';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @HealthPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @HealthPersonaId,
    N'health_service_staff',
    N'Zorgmedewerker',
    N'Huisarts, apotheker of praktijkbalie — korte, natuurlijke hulp bij klachten en praktische stappen (taaloefening, geen diagnose).',
    N'Rustig, kort Nederlands; één vraag of instructie per beurt; geen les midden in het gesprek; blijf in-scène.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner","Language practice only — no detailed medical advice"]',
    N'stethoscope',
    N'Goedemiddag — waarmee kan ik u helpen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Zorgmedewerker',
      RoleDescription = N'Huisarts, apotheker of praktijkbalie — korte, natuurlijke hulp bij klachten en praktische stappen (taaloefening, geen diagnose).',
      Tone = N'Rustig, kort Nederlands; één vraag of instructie per beurt; geen les midden in het gesprek; blijf in-scène.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner","Language practice only — no detailed medical advice"]',
      IntroLine = N'Goedemiddag — waarmee kan ik u helpen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @HealthPersonaId;
END
GO

DECLARE @DoctorPharmacyScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-00000000000C';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @DoctorPharmacyScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @DoctorPharmacyScenarioId,
    N'doctor_pharmacy',
    N'Doctor / pharmacy',
    N'Explain a symptom, ask for help, and understand what to do next — in clear Dutch (language practice, not medical advice).',
    N'Patient',
    N'["Beschrijf kort wat er mis is (symptoom) in eenvoudig Nederlands.","Vraag duidelijk om hulp: medicijn, afspraak of wat u kunt doen.","Bevestig of vraag door over een praktische instructie.","Houd het kort en duidelijk — taaloefening, geen diagnose."]',
    N'["Ik heb hoofdpijn.","Mijn keel doet pijn.","Kunt u mij helpen?","Heeft u iets tegen hoest?","Twee keer per dag?","Kan ik een afspraak maken?"]',
    N'A2',
    N'["health","doctor","pharmacy","clinic","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Doctor / pharmacy',
      Description = N'Explain a symptom, ask for help, and understand what to do next — in clear Dutch (language practice, not medical advice).',
      UserRole = N'Patient',
      GoalsJson = N'["Beschrijf kort wat er mis is (symptoom) in eenvoudig Nederlands.","Vraag duidelijk om hulp: medicijn, afspraak of wat u kunt doen.","Bevestig of vraag door over een praktische instructie.","Houd het kort en duidelijk — taaloefening, geen diagnose."]',
      StarterSuggestionsJson = N'["Ik heb hoofdpijn.","Mijn keel doet pijn.","Kunt u mij helpen?","Heeft u iets tegen hoest?","Twee keer per dag?","Kan ik een afspraak maken?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["health","doctor","pharmacy","clinic","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @DoctorPharmacyScenarioId;
END
GO

PRINT N'017_doctor_pharmacy_scenario complete.';
GO
