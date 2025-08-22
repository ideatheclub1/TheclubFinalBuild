-- =====================================================
-- FIX: Broadcast Connection and Realtime Issues
-- =====================================================
-- Run this in your Supabase SQL Editor to optimize realtime/broadcast performance

-- 1. Enable realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- 2. Create indexes for better realtime performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_realtime 
ON messages(conversation_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_updated_realtime 
ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_presence_updated 
ON user_presence(updated_at DESC, status);

-- 3. Optimize user_presence table for typing indicators
CREATE INDEX IF NOT EXISTS idx_user_presence_typing 
ON user_presence(typing_in_conversation, typing_since) 
WHERE typing_in_conversation IS NOT NULL;

-- 4. Add trigger to update conversation updated_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;

-- Create the trigger
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- 5. Verify realtime is enabled for tables
SELECT schemaname, tablename, pubname 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('conversations', 'messages', 'conversation_participants', 'user_presence');

-- 6. Show current table sizes (for performance monitoring)
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    most_common_vals
FROM pg_stats 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'conversation_participants')
ORDER BY tablename, attname;

-- 7. Success notification (run this separately if you want to see the message)
DO $$
BEGIN
    RAISE NOTICE '✅ Broadcast and realtime optimizations applied successfully!';
    RAISE NOTICE 'ℹ️  Make sure to restart your app to see the improvements.';
END $$;
