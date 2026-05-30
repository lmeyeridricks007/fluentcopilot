SET NOCOUNT ON;
GO

DECLARE @ShopScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000005';

IF EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @ShopScenarioId)
BEGIN
  UPDATE dbo.ScenarioDefinitions
  SET StarterSuggestionsJson = N'["Waar staat de melk?","Waar kan ik de rijst vinden?","Kunt u mij helpen?","Ik wil graag pinnen.","Nee, geen bonnetje, dank u.","Hoeveel is het?","Is deze vegetarisch?","Welke is goedkoper?"]',
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @ShopScenarioId;
END
GO

PRINT N'013_supermarket_shop_starter_suggestions complete.';
GO
