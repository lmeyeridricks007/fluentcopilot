SET NOCOUNT ON;
GO

DECLARE @ScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000001';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @ScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @ScenarioId,
    N'train-station',
    N'Train station',
    N'You are at a Dutch station. Ask about your platform, delays, and transfers in clear Dutch.',
    N'Traveller',
    N'["Ask which platform the train leaves from","Confirm time, delay, destination, or transfer","Close politely"]',
    N'["Welk perron is het?","Is de trein op tijd?","Dank u wel."]',
    N'A2',
    N'["travel","NS","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Train station',
      Description = N'You are at a Dutch station. Ask about your platform, delays, and transfers in clear Dutch.',
      GoalsJson = N'["Ask which platform the train leaves from","Confirm time, delay, destination, or transfer","Close politely"]',
      StarterSuggestionsJson = N'["Welk perron is het?","Is de trein op tijd?","Dank u wel."]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @ScenarioId;
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
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Ordering food / drinks',
      Description = N'Order food or drinks, ask one short follow-up, and close politely.',
      UserRole = N'Customer',
      GoalsJson = N'["Make a clear order","Use polite phrasing","Ask a follow-up question","Clarify or confirm one detail"]',
      StarterSuggestionsJson = N'["Ik wil graag ...","Wat raadt u aan?","Zit er melk in?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["food","drink","real-life","ordering"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @OrderingFoodScenarioId;
END
GO

DECLARE @SupermarketShopScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000005';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @SupermarketShopScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @SupermarketShopScenarioId,
    N'supermarket_shop',
    N'Supermarket / shop',
    N'Ask where something is, talk at checkout, or ask simple product questions in clear Dutch.',
    N'Customer',
    N'["Vraag duidelijk waar een product ligt.","Begrijp of bevestig de locatie (gangpad / schap).","Gebruik beleefde formulering (mag / alstublieft / dank u).","Stel één korte vervolgvraag of verduidelijking."]',
    N'["Waar staat de melk?","Waar kan ik de rijst vinden?","Kunt u mij helpen?","Ik wil graag pinnen.","Nee, geen bonnetje, dank u.","Hoeveel is het?","Is deze vegetarisch?","Welke is goedkoper?"]',
    N'A2',
    N'["shopping","supermarket","checkout","real-life"]',
    N'["guided","free"]',
    NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET Title = N'Supermarket / shop',
      Description = N'Ask where something is, talk at checkout, or ask simple product questions in clear Dutch.',
      UserRole = N'Customer',
      GoalsJson = N'["Vraag duidelijk waar een product ligt.","Begrijp of bevestig de locatie (gangpad / schap).","Gebruik beleefde formulering (mag / alstublieft / dank u).","Stel één korte vervolgvraag of verduidelijking."]',
      StarterSuggestionsJson = N'["Waar staat de melk?","Waar kan ik de rijst vinden?","Kunt u mij helpen?","Ik wil graag pinnen.","Nee, geen bonnetje, dank u.","Hoeveel is het?","Is deze vegetarisch?","Welke is goedkoper?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["shopping","supermarket","checkout","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @SupermarketShopScenarioId;
END
GO

PRINT N'002_seed_mock_scenarios complete.';
GO
