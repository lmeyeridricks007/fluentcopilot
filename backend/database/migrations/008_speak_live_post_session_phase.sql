-- Speak Live: thread-level post-session evaluation lifecycle (separate from thread Status).
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.ConversationThreads', N'SpeakLivePostSessionPhase') IS NULL
BEGIN
  ALTER TABLE dbo.ConversationThreads
    ADD SpeakLivePostSessionPhase NVARCHAR(32) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ConversationThreads_SpeakLivePostSessionPhase'
)
BEGIN
  ALTER TABLE dbo.ConversationThreads
    ADD CONSTRAINT CK_ConversationThreads_SpeakLivePostSessionPhase
    CHECK (
      SpeakLivePostSessionPhase IS NULL
      OR SpeakLivePostSessionPhase IN (N'active', N'ending', N'evaluating', N'evaluated', N'failed')
    );
END
GO

PRINT N'008_speak_live_post_session_phase applied.';
GO
