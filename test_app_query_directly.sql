-- Test the exact query the app is using to see what's happening

-- First, let's see what the app query should return
SELECT 'Testing the EXACT app query:' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.title,
  c.updated_at,
  cp.user_id,
  up.id as profile_id,
  up.username,
  up.full_name,
  up.avatar,
  up.profile_picture
FROM conversations c
INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
INNER JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
ORDER BY c.updated_at DESC;

-- Let's also test with the Supabase-style query (with !inner)
SELECT 'Testing Supabase-style query:' as info;
-- This simulates what the app is actually doing
SELECT 
  c.id,
  c.conversation_type,
  c.title,
  c.updated_at,
  cp.user_id,
  up.username,
  up.full_name
FROM conversations c
INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
INNER JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
ORDER BY c.updated_at DESC;

-- Let's check if there are any conversations at all for this user
SELECT 'All conversations for this user:' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.created_at,
  c.updated_at,
  cp.user_id,
  up.username
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
ORDER BY c.updated_at DESC;

-- Let's check what conversation IDs the app might be looking for
SELECT 'All conversation IDs in the system:' as info;
SELECT DISTINCT conversation_id FROM conversation_participants WHERE user_id = '972be8f0-272f-405d-a278-5b68fa0302a4';

-- Let's check if the specific conversation ID exists
SELECT 'Checking specific conversation ID:' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.created_at,
  c.updated_at
FROM conversations c
WHERE c.id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

-- Let's check if the participant exists for this conversation
SELECT 'Checking participant for specific conversation:' as info;
SELECT 
  cp.conversation_id,
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

-- Let's check what the app logs show - maybe there's a different conversation ID
SELECT 'All conversations with their latest messages:' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.updated_at,
  COUNT(cp.user_id) as participant_count,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as latest_message
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.conversation_type, c.updated_at
ORDER BY c.updated_at DESC;

-- Let's check if there are any messages without proper conversation references
SELECT 'Messages with conversation details:' as info;
SELECT 
  m.id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.created_at,
  c.conversation_type,
  up.username as sender_username
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
LEFT JOIN user_profiles up ON m.sender_id = up.id
ORDER BY m.created_at DESC
LIMIT 10;
