-- =====================================================
-- DEBUG DELETE MESSAGE FUNCTIONALITY
-- =====================================================
-- Run this to debug why message deletion isn't working

-- 1. Check if the required columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('is_deleted', 'deleted_at')
ORDER BY column_name;

-- 2. Check current messages structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 3. Test if you can manually update a message (replace with real message ID and user ID)
-- UNCOMMENT AND REPLACE WITH REAL IDs TO TEST:
-- UPDATE messages 
-- SET 
--   content = 'This message was deleted - MANUAL TEST',
--   is_deleted = true,
--   deleted_at = NOW()
-- WHERE id = 'YOUR_MESSAGE_ID_HERE' 
--   AND sender_id = 'YOUR_USER_ID_HERE';

-- 4. Check if any messages are marked as deleted
SELECT 
  id, 
  sender_id, 
  content, 
  is_deleted, 
  deleted_at,
  created_at
FROM messages 
WHERE is_deleted = true 
LIMIT 5;

-- 5. Check recent messages to see structure
SELECT 
  id, 
  sender_id, 
  content, 
  COALESCE(is_deleted, false) as is_deleted,
  deleted_at,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check if RLS policies are blocking updates
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;









