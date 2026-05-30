SET NOCOUNT ON;
GO

DECLARE @BookingPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000009';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @BookingPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @BookingPersonaId,
    N'booking_service_staff',
    N'Medewerker',
    N'Host, kapsalon-receptionist of baliemedewerker — korte, natuurlijke hulp bij reserveren en afspraken.',
    N'Rustig, praktisch Nederlands; één vraag per beurt; geen les midden in het gesprek.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
    N'calendar',
    N'Goedemiddag, waarmee kan ik u helpen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Medewerker',
      RoleDescription = N'Host, kapsalon-receptionist of baliemedewerker — korte, natuurlijke hulp bij reserveren en afspraken.',
      Tone = N'Rustig, praktisch Nederlands; één vraag per beurt; geen les midden in het gesprek.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
      IntroLine = N'Goedemiddag, waarmee kan ik u helpen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @BookingPersonaId;
END
GO

DECLARE @BookingScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-00000000000A';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @BookingScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @BookingScenarioId,
    N'booking_reservations',
    N'Booking / reservations',
    N'Book a table, book a time slot, ask about availability, and confirm the details in clear Dutch.',
    N'Customer',
    N'["Zeg duidelijk dat u wilt reserveren / een afspraak wilt.","Geef belangrijke reserveringsgegevens duidelijk.","Houd subtype-context helder (restaurant / kapper / afspraak).","Sluit natuurlijk af of bevestig kort."]',
    N'["Ik wil graag een tafel reserveren.","Heeft u morgen om zes uur plek?","Voor twee personen.","Onder de naam Lee."]',
    N'A2',
    N'["booking","reservation","appointment","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Booking / reservations',
      Description = N'Book a table, book a time slot, ask about availability, and confirm the details in clear Dutch.',
      UserRole = N'Customer',
      GoalsJson = N'["Zeg duidelijk dat u wilt reserveren / een afspraak wilt.","Geef belangrijke reserveringsgegevens duidelijk.","Houd subtype-context helder (restaurant / kapper / afspraak).","Sluit natuurlijk af of bevestig kort."]',
      StarterSuggestionsJson = N'["Ik wil graag een tafel reserveren.","Heeft u morgen om zes uur plek?","Voor twee personen.","Onder de naam Lee."]',
      DifficultyBand = N'A2',
      TagsJson = N'["booking","reservation","appointment","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @BookingScenarioId;
END
GO

PRINT N'016_booking_reservations_scenario complete.';
GO
