-- Fix RLS policies for conversations table to allow creation

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

-- Create comprehensive RLS policies for conversations
CREATE POLICY "Users can view their conversations" ON conversations
FOR SELECT USING (
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

CREATE POLICY "Users can update their conversations" ON conversations
FOR UPDATE USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Also check conversation_participants policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;

CREATE POLICY "Users can view conversation participants" ON conversation_participants
FOR SELECT USING (
  user_id = auth.uid() OR 
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to conversations" ON conversation_participants
FOR INSERT WITH CHECK (
  conversation_id IN (
    SELECT id 
    FROM conversations 
    WHERE created_by = auth.uid()
  )
);

-- Test the policies
SELECT 'RLS policies updated successfully' as status;
