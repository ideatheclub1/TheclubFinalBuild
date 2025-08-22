-- =====================================================
-- FIX CONVERSATION MEDIA MESSAGING DATABASE ISSUES
-- =====================================================
-- This SQL ensures the messages table supports media properly

-- Ensure the messages table has media_url column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Ensure the media_type enum includes all required types
-- Drop and recreate the constraint if needed
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file'));

-- Create index on media_url for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_media_url ON messages(media_url) WHERE media_url IS NOT NULL;

-- Create index on message_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);

-- Update any existing voice messages to use 'audio' type
UPDATE messages SET message_type = 'audio' WHERE message_type = 'voice';

-- Create a function to clean up orphaned media files (optional)
CREATE OR REPLACE FUNCTION cleanup_orphaned_media()
RETURNS void AS $$
BEGIN
    -- This function can be used to clean up media files that are no longer referenced
    -- Implementation depends on your storage cleanup strategy
    RAISE NOTICE 'Media cleanup function created - implement as needed';
END;
$$ LANGUAGE plpgsql;

-- Verify the structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('media_url', 'message_type')
ORDER BY column_name;

-- Show sample of messages with media
SELECT id, message_type, media_url IS NOT NULL as has_media, created_at
FROM messages 
WHERE message_type IN ('image', 'video', 'audio')
ORDER BY created_at DESC
LIMIT 5;









