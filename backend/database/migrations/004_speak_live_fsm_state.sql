-- Structured Speak Live conversation FSM + rolling summary (JSON).
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ConversationThreads', 'SpeakLiveStateJson') IS NULL
BEGIN
  ALTER TABLE dbo.ConversationThreads ADD SpeakLiveStateJson NVARCHAR(MAX) NULL;
END
GO

PRINT N'004_speak_live_fsm_state applied.';
GO
