-- =====================================================
-- FIX: Add missing message_type column to messages table
-- =====================================================
-- This fixes the error: "Could not find the 'message_type' column of 'messages' in the schema cache"

-- 1. Check current messages table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add the missing message_type column
DO $$
BEGIN
    -- Check if message_type column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type' 
        AND table_schema = 'public'
    ) THEN
        -- Add the message_type column
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file'));
        RAISE NOTICE '✅ Added message_type column to messages table';
    ELSE
        RAISE NOTICE 'ℹ️ message_type column already exists';
    END IF;
END $$;

-- 3. Add other potentially missing columns for completeness
DO $$
BEGIN
    -- Add media_url column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'media_url' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN media_url TEXT;
        RAISE NOTICE '✅ Added media_url column to messages table';
    END IF;
    
    -- Add is_read column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'is_read' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_read column to messages table';
    END IF;
    
    -- Add deleted_at column if missing (for soft deletes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'deleted_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added deleted_at column to messages table';
    END IF;
END $$;

-- 4. Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;

-- 5. Update existing messages to have default message_type if they're null
UPDATE messages 
SET message_type = 'text' 
WHERE message_type IS NULL;

-- 6. Verify the table structure after changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6b. Check constraints separately (if needed)
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'messages' 
AND tc.table_schema = 'public'
AND tc.constraint_type = 'CHECK';

-- 7. Test message insertion to verify the fix
DO $$
BEGIN
    -- Try to insert a test message with message_type
    INSERT INTO messages (conversation_id, sender_id, content, message_type, is_read)
    VALUES (
        '169ac01e-7c36-4dfb-9ba6-55ced829b640', 
        '972be8f0-272f-405d-a278-5b68fa0302a4', 
        'Test message with message_type', 
        'text',
        false
    );
    
    RAISE NOTICE '✅ SUCCESS: Test message with message_type inserted successfully';
    
    -- Clean up the test message
    DELETE FROM messages 
    WHERE content = 'Test message with message_type' 
    AND conversation_id = '169ac01e-7c36-4dfb-9ba6-55ced829b640';
    
    RAISE NOTICE '✅ Test message cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: Failed to insert test message: %', SQLERRM;
END $$;

-- 8. Refresh Supabase schema cache (this might help with the cache issue)
-- Note: This is a PostgREST specific command that might not work in all environments
-- NOTIFY pgrst, 'reload schema';

-- 9. Final verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '🎉 SUCCESS: messages table now has message_type column!';
        RAISE NOTICE 'ℹ️  You may need to restart your app or wait a few minutes for Supabase to update its schema cache.';
    ELSE
        RAISE NOTICE '❌ ERROR: message_type column still missing';
    END IF;
END $$;
