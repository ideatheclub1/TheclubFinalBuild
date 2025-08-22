-- Add columns for message editing and deletion functionality
-- This script adds the necessary columns to support message editing and soft deletion

-- Add is_edited column (boolean, default false)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add edited_at column (timestamp, nullable)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add is_deleted column (boolean, default false) 
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add deleted_at column (timestamp, nullable)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add comment to document the new columns
COMMENT ON COLUMN messages.is_edited IS 'Indicates if this message has been edited';
COMMENT ON COLUMN messages.edited_at IS 'Timestamp when the message was last edited';
COMMENT ON COLUMN messages.is_deleted IS 'Indicates if this message has been soft deleted';
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when the message was deleted';

-- Create an index on is_deleted for performance when filtering out deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

-- Create an index on edited_at for sorting edited messages
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('is_edited', 'edited_at', 'is_deleted', 'deleted_at')
ORDER BY column_name;









