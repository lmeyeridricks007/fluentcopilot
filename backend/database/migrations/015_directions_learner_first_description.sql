SET NOCOUNT ON;
GO

UPDATE dbo.ScenarioDefinitions
SET Description = N'You start in Dutch: ask how to get somewhere, say where you need to go, or summarize the route. The assistant only speaks after you do — short Dutch replies. Follow the on-screen situation.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Slug = N'directions_getting_somewhere';
GO

PRINT N'015_directions_learner_first_description complete.';
GO
