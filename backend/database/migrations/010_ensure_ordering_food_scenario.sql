-- Ensures Speak Live "ordering_food" scenario + default persona exist (aligns with seed 002 / 003).
-- Apply on environments that ran schema/migrations but never ran database/seed/*.sql.

SET NOCOUNT ON;
GO

DECLARE @OrderingFoodPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000003';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @OrderingFoodPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @OrderingFoodPersonaId,
    N'food_service_staff',
    N'Medewerker bediening',
    N'Barista, ober of medewerker aan de afhaalbalie — afhankelijk van de scene.',
    N'Natural, concise Dutch service style. Friendly but not over-helpful.',
    N'["Stay in scenario","Keep answers short","Do not over-coach","Create light real-world friction when useful"]',
    N'coffee',
    N'Hallo, wat wilt u bestellen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Medewerker bediening',
      RoleDescription = N'Barista, ober of medewerker aan de afhaalbalie — afhankelijk van de scene.',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @OrderingFoodPersonaId;
END
GO

DECLARE @OrderingFoodScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000004';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @OrderingFoodScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @OrderingFoodScenarioId,
    N'ordering_food',
    N'Ordering food / drinks',
    N'Order food or drinks, ask one short follow-up, and close politely.',
    N'Customer',
    N'["Make a clear order","Use polite phrasing","Ask a follow-up question","Clarify or confirm one detail"]',
    N'["Ik wil graag ...","Wat raadt u aan?","Zit er melk in?"]',
    N'A2',
    N'["food","drink","real-life","ordering"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Slug = N'ordering_food' AND IsActive = 1)
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET IsActive = 1,
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @OrderingFoodScenarioId OR Slug = N'ordering_food';
END
GO

PRINT N'010_ensure_ordering_food_scenario complete.';
GO
