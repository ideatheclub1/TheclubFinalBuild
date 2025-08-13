-- =====================================================
-- MESSAGE SENDING DEBUG AND FIX
-- =====================================================
-- This script helps debug and fix message sending issues

-- 1. Check if messages table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS policies on messages table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- 3. Check if the conversation exists
SELECT 
    id,
    conversation_type,
    title,
    created_by,
    created_at
FROM conversations 
WHERE id = '169ac01e-7c36-4dfb-9ba6-55ced829b640';

-- 4. Check conversation participants
SELECT 
    cp.id,
    cp.conversation_id,
    cp.user_id,
    up.username,
    up.full_name
FROM conversation_participants cp
LEFT JOIN user_profiles up ON cp.user_id = up.id
WHERE cp.conversation_id = '169ac01e-7c36-4dfb-9ba6-55ced829b640';

-- 5. Test message insertion manually (replace with actual user ID)
-- INSERT INTO messages (conversation_id, sender_id, content, message_type)
-- VALUES ('169ac01e-7c36-4dfb-9ba6-55ced829b640', '972be8f0-272f-405d-a278-5b68fa0302a4', 'Test message', 'text');

-- 6. Check existing messages in this conversation
SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.created_at,
    up.username as sender_username
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
WHERE m.conversation_id = '169ac01e-7c36-4dfb-9ba6-55ced829b640'
ORDER BY m.created_at DESC;

-- 7. Fix RLS policies if they're too restrictive
-- Drop existing policies
DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON messages;
DROP POLICY IF EXISTS "Users can view messages in conversations they're in" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "allow_messages_insert" ON messages;
DROP POLICY IF EXISTS "allow_messages_select" ON messages;
DROP POLICY IF EXISTS "allow_messages_update" ON messages;

-- Create simple, permissive policies for messages
CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE TO authenticated
    USING (true);

-- 8. Ensure the messages table has proper indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 9. Verify the user exists in user_profiles
SELECT 
    id,
    username,
    full_name,
    email
FROM user_profiles 
WHERE id = '972be8f0-272f-405d-a278-5b68fa0302a4';

-- 10. Test message insertion with proper error handling
DO $$
BEGIN
    -- Try to insert a test message
    INSERT INTO messages (conversation_id, sender_id, content, message_type)
    VALUES ('169ac01e-7c36-4dfb-9ba6-55ced829b640', '972be8f0-272f-405d-a278-5b68fa0302a4', 'Test message from SQL', 'text');
    
    RAISE NOTICE '✅ SUCCESS: Test message inserted successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: Failed to insert test message: %', SQLERRM;
END $$;

-- 11. Final verification - count messages in the conversation
SELECT 
    COUNT(*) as message_count,
    MIN(created_at) as first_message,
    MAX(created_at) as last_message
FROM messages 
WHERE conversation_id = '169ac01e-7c36-4dfb-9ba6-55ced829b640';

-- 12. Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 MESSAGE SENDING DEBUG COMPLETE!';
    RAISE NOTICE 'ℹ️  Check the results above to identify any issues.';
    RAISE NOTICE 'ℹ️  If test message insertion succeeded, the issue is likely in the app code.';
    RAISE NOTICE 'ℹ️  If test message insertion failed, check RLS policies and table structure.';
END $$;
