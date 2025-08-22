-- =====================================================
-- ADD STORY SHARING SUPPORT TO MESSAGES TABLE
-- =====================================================
-- This script adds the necessary columns and constraints 
-- to support sharing stories in messages

-- Add shared_story_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS shared_story_id UUID REFERENCES stories(id) ON DELETE SET NULL;

-- Create index for shared_story_id for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_shared_story_id ON messages(shared_story_id);

-- Add message type for story messages if not exists
-- Check if message_type column exists and add story to constraint
DO $$
BEGIN
    -- First, try to update the constraint to include 'story'
    BEGIN
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
        ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
            CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'post', 'reel', 'story'));
    EXCEPTION
        WHEN undefined_column THEN
            -- If message_type column doesn't exist, create it with story support
            ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text' 
                CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'post', 'reel', 'story'));
    END;
END $$;

-- Function to check if a shared story has expired
CREATE OR REPLACE FUNCTION is_story_expired(story_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    story_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT expires_at INTO story_expires_at
    FROM stories
    WHERE id = story_id;
    
    -- If story not found, consider it expired
    IF story_expires_at IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if current time is past expiration
    RETURN NOW() > story_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get story expiration status for messages
CREATE OR REPLACE FUNCTION get_story_message_content(message_id UUID)
RETURNS JSONB AS $$
DECLARE
    message_record RECORD;
    story_record RECORD;
    result JSONB;
BEGIN
    -- Get the message with story info
    SELECT m.*, s.expires_at, s.user_id as story_user_id, s.image_url, s.video_url, s.media_type
    INTO message_record
    FROM messages m
    LEFT JOIN stories s ON m.shared_story_id = s.id
    WHERE m.id = message_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Message not found');
    END IF;
    
    -- If no story is shared, return the regular message
    IF message_record.shared_story_id IS NULL THEN
        RETURN json_build_object(
            'type', 'regular',
            'content', message_record.content,
            'message_type', message_record.message_type
        );
    END IF;
    
    -- Check if story has expired
    IF message_record.expires_at IS NULL OR NOW() > message_record.expires_at THEN
        RETURN json_build_object(
            'type', 'expired_story',
            'content', 'This story has expired',
            'message_type', 'story',
            'story_expired', TRUE,
            'original_content', message_record.content
        );
    END IF;
    
    -- Story is still active
    RETURN json_build_object(
        'type', 'active_story',
        'content', message_record.content,
        'message_type', 'story',
        'story_expired', FALSE,
        'story', json_build_object(
            'id', message_record.shared_story_id,
            'image_url', message_record.image_url,
            'video_url', message_record.video_url,
            'media_type', message_record.media_type,
            'expires_at', message_record.expires_at
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies to include story sharing
-- Drop existing policy if it exists and recreate with story support
DROP POLICY IF EXISTS "Users can read messages with shared stories" ON messages;

-- Allow users to read messages with stories they have access to
CREATE POLICY "Users can read messages with shared stories" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
        )
        OR
        (shared_story_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM stories s
            WHERE s.id = shared_story_id
            AND (s.user_id = auth.uid() OR s.user_id IN (
                SELECT user_id FROM conversation_participants
                WHERE conversation_id = messages.conversation_id
            ))
        ))
    );

-- Test the new functionality
SELECT 'Story sharing setup completed successfully!' as status;

-- Show current message types allowed
SELECT 
    table_name,
    column_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'messages' AND ccu.column_name = 'message_type';