-- =====================================================
-- BASIC MESSAGE EDIT/DELETE SETUP
-- =====================================================
-- This is the safest version - just adds columns and basic indexes
-- No complex policies or functions that could cause type errors

-- =====================================================
-- 1. ADD REQUIRED COLUMNS
-- =====================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =====================================================
-- 2. ADD BASIC INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- Check that columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('is_edited', 'edited_at', 'is_deleted', 'deleted_at')
ORDER BY column_name;

-- Check data types of key columns
SELECT 
  column_name,
  data_type,
  udt_name as underlying_type
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('id', 'sender_id', 'conversation_id')
ORDER BY column_name;

SELECT 'Basic setup completed! Check the output above to see your column types.' as status;









