-- Repair SessionType values before (re)applying CK_SessionLearningInsights_SessionType.
-- Msg 547 on ADD CONSTRAINT: existing rows violated the new CHECK — usually legacy or manual values
-- not in (speak_live | text_conversation | read_aloud | listening | quick_capture).
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.SessionLearningInsights', N'U') IS NULL
BEGIN
  PRINT N'046 skipped: dbo.SessionLearningInsights does not exist.';
END
ELSE
BEGIN
  -- Normalize known aliases / experiments → supported bucket for the CHECK.
  UPDATE dbo.SessionLearningInsights
  SET SessionType = N'speak_live'
  WHERE SessionType IN (N'live_voice', N'speak_live_scenario');

  UPDATE dbo.SessionLearningInsights
  SET SessionType = N'text_conversation'
  WHERE SessionType IN (N'language_coach', N'guided', N'free_chat');

  -- Anything still outside the allowed set → text_conversation (safe default for non-speak-live rows).
  UPDATE dbo.SessionLearningInsights
  SET SessionType = N'text_conversation'
  WHERE SessionType NOT IN (
    N'speak_live',
    N'text_conversation',
    N'read_aloud',
    N'listening',
    N'quick_capture'
  );

  IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_SessionLearningInsights_SessionType'
      AND parent_object_id = OBJECT_ID(N'dbo.SessionLearningInsights', N'U')
  )
  BEGIN
    ALTER TABLE dbo.SessionLearningInsights DROP CONSTRAINT CK_SessionLearningInsights_SessionType;
  END

  ALTER TABLE dbo.SessionLearningInsights
    ADD CONSTRAINT CK_SessionLearningInsights_SessionType CHECK (
      SessionType IN (
        N'speak_live',
        N'text_conversation',
        N'read_aloud',
        N'listening',
        N'quick_capture'
      )
    );

  PRINT N'046_session_learning_insights_session_type_data_fix applied.';
END
GO
