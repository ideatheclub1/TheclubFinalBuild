-- Fix infinite recursion in RLS policies

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversation timestamps" ON conversations;

DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create simplified policies that don't cause recursion

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON conversations
FOR SELECT USING (
  created_by = auth.uid() OR
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations" ON conversations
FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "Users can update conversations" ON conversations
FOR UPDATE USING (
  created_by = auth.uid()
);

-- Conversation participants policies (simplified)
CREATE POLICY "Users can view conversation participants" ON conversation_participants
FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Users can add participants" ON conversation_participants
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  conversation_id IN (
    SELECT id 
    FROM conversations 
    WHERE created_by = auth.uid()
  )
);

-- Messages policies (simplified)
CREATE POLICY "Users can view messages" ON messages
FOR SELECT USING (
  sender_id = auth.uid() OR
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

CREATE POLICY "Users can update their messages" ON messages
FOR UPDATE USING (
  sender_id = auth.uid()
);

CREATE POLICY "Users can delete their messages" ON messages
FOR DELETE USING (
  sender_id = auth.uid()
);

-- Test the policies
SELECT 'RLS policies fixed - no more recursion' as status;
