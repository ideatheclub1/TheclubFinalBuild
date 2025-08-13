-- Fix missing participants for conversation
-- This script will add the missing participants to the conversation_participants table

-- First, let's check what we have
SELECT 'Current conversation data:' as info;
SELECT * FROM conversations WHERE id = '5cf52f93-ea08-4135-b246-4b5125388d2c';

SELECT 'Current participants:' as info;
SELECT * FROM conversation_participants WHERE conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c';

-- Check messages to see who was involved in this conversation
SELECT 'Messages in this conversation:' as info;
SELECT 
  m.sender_id,
  up.username,
  up.full_name,
  m.content,
  m.created_at
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
WHERE m.conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c'
ORDER BY m.created_at;

-- Get unique participants from messages
SELECT 'Unique participants from messages:' as info;
SELECT DISTINCT 
  m.sender_id,
  up.username,
  up.full_name
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
WHERE m.conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c';

-- Add missing participants based on who sent messages
-- This will insert participants if they don't already exist
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  '5cf52f93-ea08-4135-b246-4b5125388d2c',
  m.sender_id
FROM (
  SELECT DISTINCT sender_id
  FROM messages 
  WHERE conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c'
) m
WHERE m.sender_id NOT IN (
  SELECT user_id 
  FROM conversation_participants 
  WHERE conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c'
);

-- Verify the fix
SELECT 'After fix - participants:' as info;
SELECT 
  cp.conversation_id,
  cp.user_id,
  up.username,
  up.full_name,
  up.avatar
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c';
