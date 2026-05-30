/*
  Reference / enum-style data (minimal for Feature 1).
  Idempotent MERGE-style patterns where applicable.
*/

SET NOCOUNT ON;
GO

-- Dev user (ExternalId matches common local-demo pattern; adjust for your auth)
DECLARE @DevUserId UNIQUEIDENTIFIER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @DevUserId)
BEGIN
  INSERT INTO dbo.Users (Id, ExternalId, Email, DisplayName)
  VALUES (@DevUserId, N'local-demo-user', N'dev@example.local', N'Local Dev User');
END
GO

PRINT N'001_seed_reference_data complete.';
GO
