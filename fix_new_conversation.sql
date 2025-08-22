-- Fix the new conversation: 8f024cca-29e5-49b6-9228-5f32e6c9112e
-- Add participants based on who sent messages

-- Check what we have
SELECT 'Current conversation:' as info;
SELECT * FROM conversations WHERE id = '8f024cca-29e5-49b6-9228-5f32e6c9112e';

SELECT 'Messages in this conversation:' as info;
SELECT 
  m.sender_id,
  up.username,
  m.content,
  m.created_at
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
WHERE m.conversation_id = '8f024cca-29e5-49b6-9228-5f32e6c9112e'
ORDER BY m.created_at;

-- Add participants based on message senders
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT DISTINCT
  '8f024cca-29e5-49b6-9228-5f32e6c9112e',
  m.sender_id
FROM messages m
WHERE m.conversation_id = '8f024cca-29e5-49b6-9228-5f32e6c9112e'
  AND m.sender_id NOT IN (
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = '8f024cca-29e5-49b6-9228-5f32e6c9112e'
  );

-- Verify the fix
SELECT 'After fix:' as status;
SELECT 
  cp.user_id,
  up.username,
  up.full_name,
  up.avatar
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '8f024cca-29e5-49b6-9228-5f32e6c9112e';
