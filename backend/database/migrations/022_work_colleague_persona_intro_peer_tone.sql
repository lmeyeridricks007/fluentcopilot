-- Workplace Speak Live: persona intro matches collegial tone (not service-desk Dutch).
SET NOCOUNT ON;
GO

UPDATE dbo.PersonaDefinitions
SET IntroLine = N'Hoi — dag. Heb je even? Ik wilde kort checken hoe het loopt.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 'c3d4e5f6-a7b8-4001-8010-00000000000F'
  AND Slug = N'workplace_colleague_staff';
GO

PRINT N'022_work_colleague_persona_intro_peer_tone complete.';
GO
