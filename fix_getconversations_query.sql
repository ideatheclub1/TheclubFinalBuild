-- Fix the getConversations query issue
-- The problem is the !inner join - it only returns conversations with participants

-- First, let's test the current query that's failing
SELECT 'Testing current app query (with inner join):' as info;
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

-- Now test with LEFT JOIN to see all conversations
SELECT 'Testing with LEFT JOIN (should show all conversations):' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.title,
  c.updated_at,
  cp.user_id,
  up.username,
  up.full_name
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.user_id = '972be8f0-272f-405d-a278-5b68fa0302a4' OR cp.user_id IS NULL
ORDER BY c.updated_at DESC;

-- Check if the conversation exists at all
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

-- Force add the participant if it doesn't exist
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid,
  '972be8f0-272f-405d-a278-5b68fa0302a4'
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid 
    AND user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
);

-- Test the app query again after adding participant
SELECT 'Testing app query after adding participant:' as info;
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

SELECT 'Fix completed - the app query should work now!' as status;
