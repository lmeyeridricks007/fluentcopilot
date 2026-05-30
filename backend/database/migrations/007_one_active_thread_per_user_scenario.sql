-- At most one *active* thread per user + scenario (prevents parallel /conversations/start races
-- from creating two rows then pausing the first — client kept a paused threadId and speak-live/turn failed).

;WITH dup AS (
  SELECT
    Id,
    ROW_NUMBER() OVER (PARTITION BY UserId, ScenarioId ORDER BY UpdatedAt DESC, CreatedAt DESC) AS rn
  FROM dbo.ConversationThreads
  WHERE Status = N'active'
)
UPDATE t
SET Status = N'paused', UpdatedAt = SYSUTCDATETIME()
FROM dbo.ConversationThreads t
INNER JOIN dup d ON d.Id = t.Id
WHERE d.rn > 1;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes i
  INNER JOIN sys.tables t ON i.object_id = t.object_id
  WHERE i.name = N'UQ_ConversationThreads_UserScenario_Active'
    AND t.name = N'ConversationThreads'
    AND SCHEMA_NAME(t.schema_id) = N'dbo'
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX UQ_ConversationThreads_UserScenario_Active
    ON dbo.ConversationThreads (UserId, ScenarioId)
    WHERE Status = N'active';
END
GO
