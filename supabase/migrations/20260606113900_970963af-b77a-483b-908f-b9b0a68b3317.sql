-- Remove overly permissive realtime.messages policies that allowed any authenticated
-- user to subscribe to or publish on any private Realtime channel.
-- These policies only affected private channels (config.private = true). The app
-- currently uses only public broadcast channels, so this change has no functional
-- impact. Future private-channel features will need topic-scoped policies.

DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime broadcasts" ON realtime.messages;