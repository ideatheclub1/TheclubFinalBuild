-- Comprehensive database diagnostic
-- Check for missing columns, data issues, and schema problems

-- 1. Check conversation_participants table structure
SELECT 'conversation_participants table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_participants' 
ORDER BY ordinal_position;

-- 2. Check conversations table structure
SELECT 'conversations table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
ORDER BY ordinal_position;

-- 3. Check messages table structure
SELECT 'messages table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- 4. Check user_profiles table structure
SELECT 'user_profiles table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 5. Check current conversation data
SELECT 'Current conversation data:' as info;
SELECT * FROM conversations WHERE id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

-- 6. Check current participants (if any)
SELECT 'Current participants:' as info;
SELECT * FROM conversation_participants WHERE conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

-- 7. Check messages in conversation
SELECT 'Messages in conversation:' as info;
SELECT * FROM messages WHERE conversation_id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid ORDER BY created_at;

-- 8. Check user profile data for the sender
SELECT 'User profile for sender:' as info;
SELECT * FROM user_profiles WHERE id = '972be8f0-272f-405d-a278-5b68fa0302a4';

-- 9. Test the exact query that the app uses
SELECT 'Testing app query:' as info;
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
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN user_profiles up ON cp.user_id = up.id
WHERE c.id = '9f81dfef-4869-4f3e-8eef-224cb3f89ccf'::uuid;

-- 10. Check for any foreign key constraints
SELECT 'Foreign key constraints:' as info;
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('conversation_participants', 'messages', 'conversations');

-- 11. Check RLS status
SELECT 'RLS status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages');
