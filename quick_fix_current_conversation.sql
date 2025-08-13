-- Quick fix for the current conversation that's showing empty participants

-- Add the missing participant to conversation 7c963b92-6a29-4165-a2b1-2b584e9fa9a8
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES 
  ('7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid, '972be8f0-272f-405d-a278-5b68fa0302a4')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Verify the fix
SELECT 'After fix - conversation participants:' as info;
SELECT 
  cp.conversation_id,
  cp.user_id,
  up.username,
  up.full_name
FROM conversation_participants cp
JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid;

-- Test the app query
SELECT 'Testing app query:' as info;
SELECT 
  c.id,
  c.conversation_type,
  c.created_at,
  c.updated_at,
  cp.user_id,
  up.username,
  up.full_name
FROM conversations c
INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
INNER JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.user_id = '972be8f0-272f-405d-a278-5b68fa0302a4'
ORDER BY c.updated_at DESC;
