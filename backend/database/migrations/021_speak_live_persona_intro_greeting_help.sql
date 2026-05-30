-- Align PersonaDefinitions.IntroLine with Speak Live runtime: begroeting + aanbod om te helpen
-- (zelfde intentie als backend/src/domain/speakLive/*Scenario.ts opening pools).

SET NOCOUNT ON;
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Goedemiddag — welkom. Waarmee kan ik u helpen? Ik kan het perron, de vertrektijd of overstappen voor u nakijken.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000002'
  AND Slug = N'ns_station_assistant';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Hallo — welkom. Waarmee kan ik u helpen?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000003'
  AND Slug = N'food_service_staff';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Goedemiddag — waarmee kan ik u helpen?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000006'
  AND Slug = N'shop_retail_staff';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Hallo — goedemiddag. Kan ik u helpen met de weg?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000007'
  AND Slug = N'directions_helper';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Goedemiddag — welkom. Waarmee kan ik u helpen?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000009'
  AND Slug = N'booking_service_staff';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Goedemiddag — welkom. Waarmee kan ik u helpen?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-00000000000B'
  AND Slug = N'health_service_staff';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Hoi — dag. Waarmee kan ik je helpen?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-00000000000F'
  AND Slug = N'workplace_colleague_staff';
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Dag — welkom. Waarmee kan ik u helpen over de woning?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-000000000011'
  AND Slug = N'housing_contact_staff';
GO

PRINT N'021_speak_live_persona_intro_greeting_help complete.';
GO
