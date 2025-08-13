-- Check the specific conversation that's showing empty participants

-- Check the conversation itself
SELECT 'Conversation details:' as info;
SELECT 
  id,
  conversation_type,
  created_by,
  created_at,
  updated_at
FROM conversations 
WHERE id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid;

-- Check if there are any participants for this conversation
SELECT 'Participants for this conversation:' as info;
SELECT 
  cp.conversation_id,
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid;

-- Check messages for this conversation
SELECT 'Messages for this conversation:' as info;
SELECT 
  m.id,
  m.sender_id,
  m.content,
  m.created_at,
  up.username as sender_username
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
WHERE m.conversation_id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid
ORDER BY m.created_at DESC;

-- Check if the current user exists
SELECT 'Current user profile:' as info;
SELECT 
  id,
  username,
  full_name,
  avatar
FROM user_profiles 
WHERE id = '972be8f0-272f-405d-a278-5b68fa0302a4';

-- Add the missing participant if it doesn't exist
SELECT 'Adding missing participant...' as info;
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid,
  '972be8f0-272f-405d-a278-5b68fa0302a4'
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid 
    AND user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
);

-- Verify the fix
SELECT 'After fix - participants:' as info;
SELECT 
  cp.conversation_id,
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid;
