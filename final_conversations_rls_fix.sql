-- Final RLS fix for conversations system
-- Handle all existing policies and create new ones

-- Disable RLS temporarily
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policies with different names
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select" ON conversation_participants;

DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON messages;
DROP POLICY IF EXISTS "Users can view messages in conversations they're in" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

-- Re-enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies with unique names

-- Conversations: Allow authenticated users to create and view
CREATE POLICY "conv_insert_policy" ON conversations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conv_select_policy" ON conversations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "conv_update_policy" ON conversations
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Conversation participants: Allow authenticated users to manage
CREATE POLICY "cp_insert_policy" ON conversation_participants
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cp_select_policy" ON conversation_participants
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Messages: Allow authenticated users to send and view
CREATE POLICY "msg_insert_policy" ON messages
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "msg_select_policy" ON messages
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "msg_update_policy" ON messages
FOR UPDATE USING (auth.uid() IS NOT NULL);
