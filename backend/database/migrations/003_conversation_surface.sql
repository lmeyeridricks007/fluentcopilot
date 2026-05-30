-- Adds per-thread surface so API/clients can distinguish text chat vs Speak Live.
-- NOTE: Column + CHECK must be in separate batches (GO). SQL Server validates the whole
-- batch before running DDL, so CHECK (ConversationSurface ...) fails if it shares a batch with ADD COLUMN.
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ConversationThreads', 'ConversationSurface') IS NULL
BEGIN
  ALTER TABLE dbo.ConversationThreads
    ADD ConversationSurface NVARCHAR(32) NOT NULL
      CONSTRAINT DF_ConversationThreads_ConversationSurface DEFAULT N'text';
END
GO

IF COL_LENGTH('dbo.ConversationThreads', 'ConversationSurface') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON t.object_id = cc.parent_object_id
    WHERE t.schema_id = SCHEMA_ID('dbo')
      AND t.name = N'ConversationThreads'
      AND cc.name = N'CK_ConversationThreads_ConversationSurface'
  )
BEGIN
  ALTER TABLE dbo.ConversationThreads
    ADD CONSTRAINT CK_ConversationThreads_ConversationSurface
      CHECK (ConversationSurface IN (N'text', N'speak_live'));
END
GO

PRINT N'003_conversation_surface applied.';
GO
