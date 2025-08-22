-- Check what conversations actually exist and fix the issue

-- First, let's see what conversations exist
SELECT 'All conversations in database:' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.created_at,
  c.updated_at,
  COUNT(cp.user_id) as participant_count
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
GROUP BY c.id, c.conversation_type, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;

-- Check what messages exist and their conversation IDs
SELECT 'All messages and their conversations:' as info;
SELECT 
  m.id as message_id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.created_at,
  c.conversation_type,
  c.created_at as conversation_created
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
ORDER BY m.created_at DESC;

-- Check if there are any orphaned messages (messages without conversations)
SELECT 'Orphaned messages (no conversation):' as info;
SELECT 
  m.id as message_id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.created_at
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;

-- Check user profile for the current user
SELECT 'Current user profile:' as info;
SELECT 
  id,
  username,
  full_name,
  avatar,
  profile_picture
FROM user_profiles 
WHERE id = '972be8f0-272f-405d-a278-5b68fa0302a4';

-- If there are orphaned messages, we need to create a conversation for them
-- Let's create a new conversation for the orphaned messages
SELECT 'Creating conversation for orphaned messages...' as info;

-- First, let's see what conversation ID the messages are trying to use
SELECT 'Messages trying to use conversation ID:' as info;
SELECT DISTINCT conversation_id FROM messages WHERE conversation_id IS NOT NULL;

-- If the conversation ID from your logs doesn't exist, we need to create it
-- Let's create a new conversation with the ID from your logs
INSERT INTO conversations (id, conversation_type, created_by, created_at, updated_at)
SELECT 
  '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid,
  'direct',
  '972be8f0-272f-405d-a278-5b68fa0302a4',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM conversations WHERE id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid
);

-- Now add the participant
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid,
  '972be8f0-272f-405d-a278-5b68fa0302a4'
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid 
    AND user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
);

-- Verify the fix
SELECT 'After fix - conversation exists:' as info;
SELECT * FROM conversations WHERE id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

SELECT 'After fix - participant exists:' as info;
SELECT 
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

SELECT 'Fix completed - refresh your app now!' as status;
