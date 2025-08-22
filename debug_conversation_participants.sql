-- Debug query to check conversation participants
-- Replace the conversation ID with the actual one from the logs

SELECT 
  c.id as conversation_id,
  c.created_at as conversation_created,
  cp.user_id,
  up.username,
  up.full_name,
  up.avatar
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN user_profiles up ON cp.user_id = up.id
WHERE c.id = '5cf52f93-ea08-4135-b246-4b5125388d2c'
ORDER BY c.created_at;

-- Also check if the conversation exists at all
SELECT * FROM conversations WHERE id = '5cf52f93-ea08-4135-b246-4b5125388d2c';

-- Check if there are any participants for this conversation
SELECT * FROM conversation_participants WHERE conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c';

-- Check all participants for the current user
SELECT 
  cp.conversation_id,
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id IN (
  SELECT conversation_id 
  FROM conversation_participants 
  WHERE user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
);
