-- Fix RLS policies for messages table to allow sending messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create comprehensive RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" ON messages
FOR UPDATE USING (
  sender_id = auth.uid()
);

CREATE POLICY "Users can delete their own messages" ON messages
FOR DELETE USING (
  sender_id = auth.uid()
);

-- Also ensure conversations table has proper policies for updating timestamps
DROP POLICY IF EXISTS "Users can update conversation timestamps" ON conversations;

CREATE POLICY "Users can update conversation timestamps" ON conversations
FOR UPDATE USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Test the policies
SELECT 'Messages RLS policies updated successfully' as status;
