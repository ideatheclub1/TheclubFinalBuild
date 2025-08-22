-- =====================================================
-- MESSAGE EDIT/DELETE BACKEND SQL SETUP
-- =====================================================
-- This script sets up the complete backend for message editing and deletion
-- Run this in your Supabase SQL editor or database management tool

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

-- Update the existing SELECT policy to optionally show deleted messages
-- (You may want to modify this based on your app's requirements)
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
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get messages excluding deleted ones (optional filter)
CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id TEXT,
  p_include_deleted BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  conversation_id TEXT,
  sender_id TEXT,
  content TEXT,
  message_type TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  shared_post_id TEXT,
  shared_reel_id TEXT,
  is_read BOOLEAN,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id::TEXT,
    m.conversation_id::TEXT,
    m.sender_id,
    m.content,
    m.message_type,
    m.media_url,
    m.thumbnail_url,
    m.duration,
    m.shared_post_id::TEXT,
    m.shared_reel_id::TEXT,
    m.is_read,
    m.is_edited,
    m.edited_at,
    m.is_deleted,
    m.deleted_at,
    m.created_at
  FROM messages m
  WHERE m.conversation_id::TEXT = p_conversation_id
    AND (p_include_deleted = TRUE OR m.is_deleted = FALSE)
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to edit a message
CREATE OR REPLACE FUNCTION edit_message(
  p_message_id TEXT,
  p_new_content TEXT,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_exists BOOLEAN;
BEGIN
  -- Check if message exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM messages 
    WHERE id::TEXT = p_message_id 
      AND sender_id = p_user_id 
      AND is_deleted = FALSE
  ) INTO message_exists;
  
  IF NOT message_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Update the message
  UPDATE messages 
  SET 
    content = p_new_content,
    is_edited = TRUE,
    edited_at = NOW()
  WHERE id::TEXT = p_message_id 
    AND sender_id = p_user_id;
    
  RETURN TRUE;
END;
$$;

-- Function to delete (soft delete) a message
CREATE OR REPLACE FUNCTION delete_message(
  p_message_id TEXT,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_exists BOOLEAN;
BEGIN
  -- Check if message exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM messages 
    WHERE id::TEXT = p_message_id 
      AND sender_id = p_user_id 
      AND is_deleted = FALSE
  ) INTO message_exists;
  
  IF NOT message_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Soft delete the message
  UPDATE messages 
  SET 
    content = 'This message was deleted',
    is_deleted = TRUE,
    deleted_at = NOW()
  WHERE id::TEXT = p_message_id 
    AND sender_id = p_user_id;
    
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 6. CREATE AUDIT TRIGGER (OPTIONAL)
-- =====================================================

-- Create audit table for message changes (optional but recommended)
CREATE TABLE IF NOT EXISTS message_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT,
  action TEXT NOT NULL, -- 'EDIT' or 'DELETE'
  old_content TEXT,
  new_content TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_message_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only audit updates that change content, is_edited, or is_deleted
  IF TG_OP = 'UPDATE' THEN
    -- Check if message was edited
    IF NEW.is_edited = TRUE AND OLD.is_edited = FALSE THEN
      INSERT INTO message_audit (message_id, action, old_content, new_content, changed_by)
      VALUES (NEW.id::TEXT, 'EDIT', OLD.content, NEW.content, NEW.sender_id);
    END IF;
    
    -- Check if message was deleted
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
      INSERT INTO message_audit (message_id, action, old_content, new_content, changed_by)
      VALUES (NEW.id::TEXT, 'DELETE', OLD.content, NEW.content, NEW.sender_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS audit_message_changes_trigger ON messages;
CREATE TRIGGER audit_message_changes_trigger
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION audit_message_changes();

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT ON message_audit TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages TO authenticated;
GRANT EXECUTE ON FUNCTION edit_message TO authenticated;
GRANT EXECUTE ON FUNCTION delete_message TO authenticated;

-- =====================================================
-- 8. VERIFICATION QUERIES
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
  AND indexname LIKE '%edit%' OR indexname LIKE '%delet%'
ORDER BY indexname;

-- Test the functions (uncomment to test)
-- SELECT edit_message('your-message-id-here', 'New content', 'your-user-id-here');
-- SELECT delete_message('your-message-id-here', 'your-user-id-here');

-- =====================================================
-- 9. OPTIONAL: CLEANUP OLD DATA
-- =====================================================

-- If you want to clean up any test data or reset existing messages
-- UNCOMMENT THESE LINES ONLY IF YOU WANT TO RESET ALL MESSAGES:

-- UPDATE messages SET 
--   is_edited = FALSE, 
--   edited_at = NULL, 
--   is_deleted = FALSE, 
--   deleted_at = NULL;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Summary of what was created:
-- ✅ Added 4 new columns to messages table
-- ✅ Created performance indexes
-- ✅ Updated RLS policies for security
-- ✅ Created helper functions for edit/delete operations
-- ✅ Created audit table and trigger for change tracking
-- ✅ Granted appropriate permissions

SELECT 'Message edit/delete backend setup completed successfully!' as status;
