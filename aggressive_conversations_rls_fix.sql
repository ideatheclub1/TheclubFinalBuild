-- Aggressive RLS fix for conversations system
-- Completely remove all policies and recreate simple ones

-- Disable RLS temporarily
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON conversations;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON messages;
DROP POLICY IF EXISTS "Users can view messages in conversations they're in" ON messages;

-- Re-enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- Conversations: Allow authenticated users to create and view
CREATE POLICY "conversations_insert" ON conversations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversations_select" ON conversations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "conversations_update" ON conversations
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Conversation participants: Allow authenticated users to manage
CREATE POLICY "conversation_participants_insert" ON conversation_participants
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversation_participants_select" ON conversation_participants
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Messages: Allow authenticated users to send and view
CREATE POLICY "messages_insert" ON messages
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "messages_select" ON messages
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "messages_update" ON messages
FOR UPDATE USING (auth.uid() IS NOT NULL);
