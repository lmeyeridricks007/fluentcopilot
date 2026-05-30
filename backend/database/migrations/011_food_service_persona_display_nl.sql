-- Sync Dutch display name for ordering-food persona (fixes DBs that ran 010 before DisplayName was NL).
SET NOCOUNT ON;
GO

UPDATE dbo.PersonaDefinitions
SET DisplayName = N'Medewerker bediening',
    RoleDescription = N'Barista, ober of medewerker aan de afhaalbalie — afhankelijk van de scene.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000003';

GO

PRINT N'011_food_service_persona_display_nl complete.';
GO
