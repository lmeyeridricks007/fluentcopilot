SET NOCOUNT ON;
GO

DECLARE @MnpPersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000017';

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Hoi, ik ben Luca — leuk je te ontmoeten. Waar kom je vandaan?',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = @MnpPersonaId;

PRINT N'031_meeting_new_people_persona_intro_with_name complete.';
GO
