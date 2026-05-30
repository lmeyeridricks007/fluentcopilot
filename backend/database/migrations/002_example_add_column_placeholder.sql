/*
  Placeholder migration — replace with real changes.
  Example pattern for additive, idempotent column:

IF COL_LENGTH('dbo.ConversationThreads', 'CorrelationId') IS NULL
BEGIN
  ALTER TABLE dbo.ConversationThreads ADD CorrelationId NVARCHAR(64) NULL;
END
GO
*/

PRINT N'002_example_add_column_placeholder — no-op template.';
GO
