SET NOCOUNT ON;
GO

DECLARE @ShopPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000006';

IF NOT EXISTS (SELECT 1 FROM dbo.PersonaDefinitions WHERE Id = @ShopPersonaId)
BEGIN
  INSERT INTO dbo.PersonaDefinitions (
    Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
  )
  VALUES (
    @ShopPersonaId,
    N'shop_retail_staff',
    N'Medewerker',
    N'Medewerker in supermarkt, buurtwinkel, drogist of algemene winkel — korte, natuurlijke hulp.',
    N'Praktisch en vriendelijk Nederlands winkelpersoneel. Korte zinnen, lichte realisme-wrijving.',
    N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
    N'shopping_cart',
    N'Goedemiddag, waarmee kan ik u helpen?'
  );
END
ELSE
BEGIN
  UPDATE dbo.PersonaDefinitions
  SET DisplayName = N'Medewerker',
      RoleDescription = N'Medewerker in supermarkt, buurtwinkel, drogist of algemene winkel — korte, natuurlijke hulp.',
      Tone = N'Praktisch en vriendelijk Nederlands winkelpersoneel. Korte zinnen, lichte realisme-wrijving.',
      StyleRulesJson = N'["Stay in scenario","Keep answers short","Do not tutor mid-scene","Dutch only to the learner"]',
      IntroLine = N'Goedemiddag, waarmee kan ik u helpen?',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @ShopPersonaId;
END
GO

DECLARE @ShopScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000005';

IF NOT EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @ShopScenarioId)
BEGIN
  INSERT INTO dbo.ScenarioDefinitions (
    Id, Slug, Title, Description, UserRole,
    GoalsJson, StarterSuggestionsJson, DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
  )
  VALUES (
    @ShopScenarioId,
    N'supermarket_shop',
    N'Supermarket / shop',
    N'Ask where something is, talk at checkout, or ask simple product questions in clear Dutch.',
    N'Customer',
    N'["Vraag duidelijk waar een product ligt.","Begrijp of bevestig de locatie (gangpad / schap).","Gebruik beleefde formulering (mag / alstublieft / dank u).","Stel één korte vervolgvraag of verduidelijking."]',
    N'["Waar is …?","Mag ik een bon, alstublieft?","Hoeveel kost dit?"]',
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
      StarterSuggestionsJson = N'["Waar is …?","Mag ik een bon, alstublieft?","Hoeveel kost dit?"]',
      DifficultyBand = N'A2',
      TagsJson = N'["shopping","supermarket","checkout","real-life"]',
      AllowedModesJson = N'["guided","free"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @ShopScenarioId;
END
GO

PRINT N'012_supermarket_shop_scenario complete.';
GO
