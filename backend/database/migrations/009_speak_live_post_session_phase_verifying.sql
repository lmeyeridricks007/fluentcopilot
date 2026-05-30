-- Allow the new Speak Live post-session QA phase in thread state.
SET NOCOUNT ON;
GO

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_ConversationThreads_SpeakLivePostSessionPhase'
)
BEGIN
  ALTER TABLE dbo.ConversationThreads
    DROP CONSTRAINT CK_ConversationThreads_SpeakLivePostSessionPhase;
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_ConversationThreads_SpeakLivePostSessionPhase'
)
BEGIN
  ALTER TABLE dbo.ConversationThreads
    ADD CONSTRAINT CK_ConversationThreads_SpeakLivePostSessionPhase
    CHECK (
      SpeakLivePostSessionPhase IS NULL
      OR SpeakLivePostSessionPhase IN (
        N'active',
        N'ending',
        N'evaluating',
        N'verifying',
        N'evaluated',
        N'failed'
      )
    );
END
GO

PRINT N'009_speak_live_post_session_phase_verifying applied.';
GO
