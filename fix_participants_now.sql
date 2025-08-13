-- Quick fix for participants - RLS is already disabled
-- Fix the current conversation: 9f81dfef-4869-4f3e-8eef-224cb3f89ccf

-- Check current state
SELECT 'Current participants:' as status;
SELECT 
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

-- Check messages to see who should be participants
SELECT 'Messages in conversation:' as status;
SELECT 
  m.sender_id,
  up.username,
  m.content
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
WHERE m.conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid
ORDER BY m.created_at;

-- Add participants based on who sent messages
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT DISTINCT
  '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid,
  m.sender_id
FROM messages m
WHERE m.conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid
  AND m.sender_id NOT IN (
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid
  );

-- Verify the fix
SELECT 'After fix - participants:' as status;
SELECT 
  cp.user_id,
  up.username,
  up.full_name,
  up.avatar
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

SELECT 'Fix completed - refresh your app now!' as status;
