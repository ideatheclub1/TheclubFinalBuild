-- Comprehensive fix for conversation participants issue
-- This script fixes existing broken conversations AND ensures future ones work

-- Step 1: Check current state
SELECT 'Current broken conversations (no participants):' as status;
SELECT 
  c.id,
  c.conversation_type,
  c.created_at,
  COUNT(cp.user_id) as participant_count
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
GROUP BY c.id, c.conversation_type, c.created_at
HAVING COUNT(cp.user_id) = 0
ORDER BY c.created_at DESC;

-- Step 2: Fix existing conversations by adding participants based on messages
SELECT 'Fixing existing conversations...' as status;

-- Add participants for conversations that have messages but no participants
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT DISTINCT 
  m.conversation_id,
  m.sender_id
FROM messages m
WHERE m.conversation_id IN (
  -- Find conversations with no participants
  SELECT c.id 
  FROM conversations c
  LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
  WHERE cp.user_id IS NULL
)
AND NOT EXISTS (
  -- Don't duplicate if participant already exists
  SELECT 1 
  FROM conversation_participants cp2 
  WHERE cp2.conversation_id = m.conversation_id 
    AND cp2.user_id = m.sender_id
);

-- Step 3: Handle conversations with no messages (orphaned conversations)
SELECT 'Orphaned conversations (no messages, no participants):' as status;
SELECT 
  c.id,
  c.conversation_type,
  c.created_by,
  c.created_at
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE cp.user_id IS NULL AND m.id IS NULL
ORDER BY c.created_at DESC;

-- Add the creator as a participant for orphaned conversations (if created_by exists)
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT 
  c.id,
  c.created_by
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE cp.user_id IS NULL 
  AND m.id IS NULL 
  AND c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM conversation_participants cp2 
    WHERE cp2.conversation_id = c.id 
      AND cp2.user_id = c.created_by
  );

-- Step 4: Verify the fix
SELECT 'After fix - conversation status:' as status;
SELECT 
  'Fixed conversations' as type,
  COUNT(*) as count
FROM conversations c
INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
UNION ALL
SELECT 
  'Still broken conversations' as type,
  COUNT(*) as count
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE cp.user_id IS NULL;

-- Step 5: Show detailed results for verification
SELECT 'Detailed verification:' as status;
SELECT 
  c.id as conversation_id,
  c.conversation_type,
  c.created_at,
  COUNT(cp.user_id) as participant_count,
  STRING_AGG(up.username, ', ') as participants
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN user_profiles up ON cp.user_id = up.id
GROUP BY c.id, c.conversation_type, c.created_at
ORDER BY c.created_at DESC
LIMIT 10;
