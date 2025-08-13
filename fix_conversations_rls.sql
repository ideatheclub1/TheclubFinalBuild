-- Fix RLS policy for conversations table
-- Allow users to create conversations and access conversations they're participants in

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON conversations;

-- Create new policies
-- Allow users to create conversations
CREATE POLICY "Users can create conversations" ON conversations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Allow users to view conversations they participate in
CREATE POLICY "Users can view conversations they participate in" ON conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- Allow users to update conversations they created
CREATE POLICY "Users can update conversations they created" ON conversations
FOR UPDATE USING (
  created_by = auth.uid()
);

-- Also fix conversation_participants RLS if needed
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

CREATE POLICY "Users can add themselves to conversations" ON conversation_participants
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view conversation participants" ON conversation_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
    AND cp2.user_id = auth.uid()
  )
);

-- Fix messages RLS if needed
DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON messages;
DROP POLICY IF EXISTS "Users can view messages in conversations they're in" ON messages;

CREATE POLICY "Users can send messages to conversations they're in" ON messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

CREATE POLICY "Users can view messages in conversations they're in" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);
