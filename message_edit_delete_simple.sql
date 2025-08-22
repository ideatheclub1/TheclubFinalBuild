-- =====================================================
-- SIMPLE MESSAGE EDIT/DELETE BACKEND SQL
-- =====================================================
-- This is a simplified version that just adds the essential database changes
-- Use this if the full version with functions causes type casting issues

-- =====================================================
-- 1. ADD COLUMNS TO MESSAGES TABLE
-- =====================================================

-- Add is_edited column (boolean, default false)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add edited_at column (timestamp, nullable)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add is_deleted column (boolean, default false) 
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add deleted_at column (timestamp, nullable)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =====================================================
-- 2. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN messages.is_edited IS 'Indicates if this message has been edited';
COMMENT ON COLUMN messages.edited_at IS 'Timestamp when the message was last edited';
COMMENT ON COLUMN messages.is_deleted IS 'Indicates if this message has been soft deleted';
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when the message was deleted';

-- =====================================================
-- 3. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Index for filtering out deleted messages (performance optimization)
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

-- Index for sorting edited messages
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);

-- Composite index for conversation messages filtering (excludes deleted)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_not_deleted 
ON messages(conversation_id, created_at DESC) 
WHERE is_deleted = FALSE;

-- =====================================================
-- 4. UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Policy: Users can edit their own messages
CREATE POLICY "Users can edit their own messages" ON messages
FOR UPDATE
TO authenticated
USING (auth.uid()::text = sender_id)
WITH CHECK (auth.uid()::text = sender_id);

-- Policy: Users can delete (soft delete) their own messages
CREATE POLICY "Users can delete their own messages" ON messages
FOR UPDATE
TO authenticated
USING (auth.uid()::text = sender_id AND is_deleted = FALSE)
WITH CHECK (auth.uid()::text = sender_id);

-- Update the existing SELECT policy to show all messages (including deleted)
-- You can modify this based on your app's requirements
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()::text
  )
);

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Verify columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('is_edited', 'edited_at', 'is_deleted', 'deleted_at')
ORDER BY column_name;

-- Verify indexes were created
SELECT 
  indexname, 
  tablename, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'messages' 
  AND (indexname LIKE '%edit%' OR indexname LIKE '%delet%')
ORDER BY indexname;

-- =====================================================
-- 6. EXAMPLE USAGE (FOR TESTING)
-- =====================================================

-- Example: Edit a message (replace with real message ID and user ID)
-- UPDATE messages 
-- SET 
--   content = 'This message has been edited',
--   is_edited = TRUE,
--   edited_at = NOW()
-- WHERE id = 'your-message-id-here' 
--   AND sender_id = 'your-user-id-here'
--   AND is_deleted = FALSE;

-- Example: Delete (soft delete) a message (replace with real message ID and user ID)
-- UPDATE messages 
-- SET 
--   content = 'This message was deleted',
--   is_deleted = TRUE,
--   deleted_at = NOW()
-- WHERE id = 'your-message-id-here' 
--   AND sender_id = 'your-user-id-here'
--   AND is_deleted = FALSE;

-- Example: Get messages for a conversation (excluding deleted)
-- SELECT * FROM messages 
-- WHERE conversation_id = 'your-conversation-id-here' 
--   AND is_deleted = FALSE 
-- ORDER BY created_at DESC;

-- Example: Get all messages for a conversation (including deleted)
-- SELECT * FROM messages 
-- WHERE conversation_id = 'your-conversation-id-here' 
-- ORDER BY created_at DESC;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

SELECT 'Simple message edit/delete backend setup completed successfully!' as status;









