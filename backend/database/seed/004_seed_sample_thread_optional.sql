/*
  OPTIONAL: sample active thread for local API smoke tests.
  Requires 001–003 seeds. Set @Run = 1 to enable.
*/
SET NOCOUNT ON;
GO

DECLARE @Run BIT = 0;
DECLARE @DevUserId UNIQUEIDENTIFIER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DECLARE @ScenarioId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000001';
DECLARE @PersonaId UNIQUEIDENTIFIER = 'c3d4e5f6-a7b8-4001-8010-000000000002';

IF @Run = 0
BEGIN
  PRINT N'004_seed_sample_thread_optional skipped (set @Run = 1).';
END
ELSE IF EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @DevUserId)
   AND EXISTS (SELECT 1 FROM dbo.ScenarioDefinitions WHERE Id = @ScenarioId)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.ConversationThreads WHERE UserId = @DevUserId AND Status = N'active' AND ScenarioId = @ScenarioId)
  BEGIN
    DECLARE @ThreadId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO dbo.ConversationThreads (Id, UserId, ScenarioId, PersonaId, Mode, FeedbackMode, Status, SummaryText, CurrentStage)
    VALUES (@ThreadId, @DevUserId, @ScenarioId, @PersonaId, N'guided', N'turn', N'active', N'Learner started train-station practice.', N'opening');

    INSERT INTO dbo.ConversationMessages (ThreadId, SenderType, MessageType, Content, MetadataJson)
    VALUES (
      @ThreadId,
      N'assistant',
      N'text',
      N'Goedemiddag. Waarmee kan ik u helpen? Ik kan het perron, de vertrektijd of overstappen voor u nakijken.',
      NULL
    );
  END
END
GO
