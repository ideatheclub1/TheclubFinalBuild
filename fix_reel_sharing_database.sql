-- =====================================================
-- FIX REEL AND POST SHARING IN CONVERSATIONS
-- =====================================================
-- This SQL adds support for sharing reels and posts in direct messages

-- 1. Add shared content columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shared_reel_id UUID REFERENCES reels(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shared_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- 2. Update message_type enum to include 'reel' and 'post'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'reel', 'post'));

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_shared_reel_id ON messages(shared_reel_id) WHERE shared_reel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_shared_post_id ON messages(shared_post_id) WHERE shared_post_id IS NOT NULL;

-- 4. Create a view for messages with shared content details
CREATE OR REPLACE VIEW messages_with_shared_content AS
SELECT 
    m.*,
    -- Reel data
    r.id as reel_id,
    r.video_url as reel_video_url,
    r.thumbnail_url as reel_thumbnail_url,
    r.caption as reel_caption,
    r.likes_count as reel_likes,
    r.comments_count as reel_comments,
    r.shares_count as reel_shares,
    r.created_at as reel_created_at,
    ru.id as reel_user_id,
    ru.username as reel_user_username,
    ru.avatar as reel_user_avatar,
    -- Post data
    p.id as post_id,
    p.image_url as post_image_url,
    p.content as post_caption,
    p.likes_count as post_likes,
    p.comments_count as post_comments,
    p.created_at as post_created_at,
    pu.id as post_user_id,
    pu.username as post_user_username,
    pu.avatar as post_user_avatar
FROM messages m
LEFT JOIN reels r ON m.shared_reel_id = r.id
LEFT JOIN user_profiles ru ON r.user_id = ru.id
LEFT JOIN posts p ON m.shared_post_id = p.id
LEFT JOIN user_profiles pu ON p.user_id = pu.id;

-- 5. Create function to send message with shared content
CREATE OR REPLACE FUNCTION send_message_with_shared_content(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_media_url TEXT DEFAULT NULL,
    p_shared_reel_id UUID DEFAULT NULL,
    p_shared_post_id UUID DEFAULT NULL
)
RETURNS TABLE(
    message_id UUID,
    conversation_id UUID,
    sender_id UUID,
    content TEXT,
    message_type TEXT,
    media_url TEXT,
    shared_reel_id UUID,
    shared_post_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    new_message_id UUID;
BEGIN
    -- Insert the message
    INSERT INTO messages (
        conversation_id, 
        sender_id, 
        content, 
        message_type, 
        media_url,
        shared_reel_id,
        shared_post_id
    )
    VALUES (
        p_conversation_id, 
        p_sender_id, 
        p_content, 
        p_message_type, 
        p_media_url,
        p_shared_reel_id,
        p_shared_post_id
    )
    RETURNING id INTO new_message_id;
    
    -- Update conversation timestamp
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = p_conversation_id;
    
    -- Increment share count if sharing reel
    IF p_shared_reel_id IS NOT NULL THEN
        UPDATE reels 
        SET shares_count = COALESCE(shares_count, 0) + 1 
        WHERE id = p_shared_reel_id;
    END IF;
    
    -- Return the message details
    RETURN QUERY
    SELECT 
        new_message_id as message_id,
        p_conversation_id as conversation_id,
        p_sender_id as sender_id,
        p_content as content,
        p_message_type as message_type,
        p_media_url as media_url,
        p_shared_reel_id as shared_reel_id,
        p_shared_post_id as shared_post_id,
        NOW() as created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update shares_count column for reels if it doesn't exist
ALTER TABLE reels ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- 7. Create index on shares_count for better performance
CREATE INDEX IF NOT EXISTS idx_reels_shares_count ON reels(shares_count);

-- 8. Verify the schema changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('shared_reel_id', 'shared_post_id', 'message_type')
ORDER BY column_name;

-- 9. Test query to see messages with shared content
SELECT 
    m.id,
    m.content,
    m.message_type,
    m.shared_reel_id IS NOT NULL as has_shared_reel,
    m.shared_post_id IS NOT NULL as has_shared_post,
    m.created_at
FROM messages m
WHERE m.message_type IN ('reel', 'post')
ORDER BY m.created_at DESC
LIMIT 5;
