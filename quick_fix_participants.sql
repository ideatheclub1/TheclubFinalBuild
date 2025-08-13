-- Quick fix for missing participants
-- Add the current user and any other users from messages to the conversation

-- Current user ID: 972be8f0-272f-405d-a278-5b68fa0302a4
-- Conversation ID: 5cf52f93-ea08-4135-b246-4b5125388d2c

-- First, add the current user as a participant
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  '5cf52f93-ea08-4135-b246-4b5125388d2c',
  '972be8f0-272f-405d-a278-5b68fa0302a4'
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c' 
    AND user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
);

-- Add any other users who sent messages in this conversation
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT DISTINCT
  '5cf52f93-ea08-4135-b246-4b5125388d2c',
  m.sender_id
FROM messages m
WHERE m.conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c'
  AND m.sender_id != '972be8f0-272f-405d-a278-5b68fa0302a4'
  AND m.sender_id NOT IN (
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c'
  );

-- Verify the results
SELECT 'Participants after fix:' as status;
SELECT 
  cp.user_id,
  up.username,
  up.full_name,
  up.avatar
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '5cf52f93-ea08-4135-b246-4b5125388d2c';
