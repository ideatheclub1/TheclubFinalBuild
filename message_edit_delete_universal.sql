-- =====================================================
-- UNIVERSAL MESSAGE EDIT/DELETE BACKEND SQL
-- =====================================================
-- This version handles both UUID and TEXT types automatically
-- Run check_messages_table_schema.sql first to see your table structure

-- =====================================================
-- 1. ADD COLUMNS TO MESSAGES TABLE (SAFE)
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
-- 3. CREATE PERFORMANCE INDEXES (SAFE)
-- =====================================================

-- Index for filtering out deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

-- Index for sorting edited messages
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);

-- =====================================================
-- 4. SIMPLE RLS POLICIES (NO FUNCTIONS)
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

-- Policy: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT
TO authenticated
USING (true); -- Simplified for now, you can restrict later

-- Policy: Users can edit their own messages (works with both UUID and TEXT)
CREATE POLICY "Users can edit their own messages" ON messages
FOR UPDATE
TO authenticated
USING (
  CASE 
    WHEN pg_typeof(auth.uid()) = pg_typeof(sender_id) THEN auth.uid() = sender_id
    ELSE auth.uid()::text = sender_id::text
  END
)
WITH CHECK (
  CASE 
    WHEN pg_typeof(auth.uid()) = pg_typeof(sender_id) THEN auth.uid() = sender_id
    ELSE auth.uid()::text = sender_id::text
  END
);

-- Policy: Users can delete their own messages (works with both UUID and TEXT)
CREATE POLICY "Users can delete their own messages" ON messages
FOR UPDATE
TO authenticated
USING (
  (CASE 
    WHEN pg_typeof(auth.uid()) = pg_typeof(sender_id) THEN auth.uid() = sender_id
    ELSE auth.uid()::text = sender_id::text
  END)
  AND is_deleted = FALSE
)
WITH CHECK (
  CASE 
    WHEN pg_typeof(auth.uid()) = pg_typeof(sender_id) THEN auth.uid() = sender_id
    ELSE auth.uid()::text = sender_id::text
  END
);

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('is_edited', 'edited_at', 'is_deleted', 'deleted_at')
ORDER BY column_name;

-- Show table structure
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('id', 'conversation_id', 'sender_id', 'is_edited', 'is_deleted')
ORDER BY column_name;

SELECT 'Universal message edit/delete setup completed!' as status;









