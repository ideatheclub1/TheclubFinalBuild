-- =====================================================
-- SUPABASE BROADCAST MESSAGING SETUP
-- Complete SQL setup for broadcast-based messaging system
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. MESSAGING TABLES (Enhanced for Broadcast)
-- =====================================================

-- Conversations table (if not exists)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    UNIQUE(conversation_id, user_id)
);

-- Messages table (enhanced for broadcast)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
    media_url TEXT,
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    reply_to UUID REFERENCES messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Message read status (for detailed read receipts)
CREATE TABLE IF NOT EXISTS message_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- User presence (for online status and typing indicators)
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    typing_in_conversation UUID REFERENCES conversations(id),
    typing_since TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON conversation_participants(conversation_id, user_id) WHERE left_at IS NULL;

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- Read status indexes
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- Presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_typing ON user_presence(typing_in_conversation) WHERE typing_in_conversation IS NOT NULL;

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Conversation creators and admins can update" ON conversations
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
        )
    );

-- Participants policies
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Users can join conversations" ON conversation_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can leave conversations" ON conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        ) AND deleted_at IS NULL
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can soft delete their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Read status policies
CREATE POLICY "Users can view read status for their conversations" ON message_read_status
    FOR SELECT USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
        )
    );

CREATE POLICY "Users can mark messages as read" ON message_read_status
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Presence policies
CREATE POLICY "Users can view presence of conversation participants" ON user_presence
    FOR SELECT USING (
        user_id IN (
            SELECT DISTINCT cp2.user_id
            FROM conversation_participants cp1
            JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = auth.uid() AND cp1.left_at IS NULL AND cp2.left_at IS NULL
        )
    );

CREATE POLICY "Users can update their own presence" ON user_presence
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 4. FUNCTIONS FOR BROADCAST MESSAGING
-- =====================================================

-- Function to get conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants(conversation_uuid UUID)
RETURNS TABLE(user_id UUID, username TEXT, avatar TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.user_id,
        up.username,
        up.avatar
    FROM conversation_participants cp
    JOIN user_profiles up ON cp.user_id = up.id
    WHERE cp.conversation_id = conversation_uuid 
    AND cp.left_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new conversation
CREATE OR REPLACE FUNCTION create_conversation(
    conversation_title TEXT DEFAULT NULL,
    conversation_type TEXT DEFAULT 'direct',
    participant_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
    new_conversation_id UUID;
    participant_id UUID;
BEGIN
    -- Create the conversation
    INSERT INTO conversations (title, type, created_by)
    VALUES (conversation_title, conversation_type, auth.uid())
    RETURNING id INTO new_conversation_id;
    
    -- Add the creator as a participant
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (new_conversation_id, auth.uid(), 'admin');
    
    -- Add other participants
    FOREACH participant_id IN ARRAY participant_ids
    LOOP
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (new_conversation_id, participant_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END LOOP;
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message with broadcast
CREATE OR REPLACE FUNCTION send_message_with_broadcast(
    p_conversation_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_media_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(
    message_id UUID,
    conversation_id UUID,
    sender_id UUID,
    content TEXT,
    message_type TEXT,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    new_message_id UUID;
    new_message messages%ROWTYPE;
BEGIN
    -- Insert the message
    INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url, metadata)
    VALUES (p_conversation_id, auth.uid(), p_content, p_message_type, p_media_url, p_metadata)
    RETURNING * INTO new_message;
    
    -- Update conversation timestamp
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = p_conversation_id;
    
    -- Send broadcast notification using realtime.send
    PERFORM realtime.send(
        jsonb_build_object(
            'event', 'new_message',
            'payload', jsonb_build_object(
                'message_id', new_message.id,
                'conversation_id', new_message.conversation_id,
                'sender_id', new_message.sender_id,
                'content', new_message.content,
                'message_type', new_message.message_type,
                'created_at', new_message.created_at
            )
        ),
        'new_message',
        'conversation-' || p_conversation_id::text,
        false -- public broadcast
    );
    
    -- Return the message details
    RETURN QUERY
    SELECT 
        new_message.id,
        new_message.conversation_id,
        new_message.sender_id,
        new_message.content,
        new_message.message_type,
        new_message.media_url,
        new_message.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read with broadcast
CREATE OR REPLACE FUNCTION mark_messages_read_with_broadcast(
    p_conversation_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    message_count INTEGER;
BEGIN
    -- Insert read status for all unread messages
    INSERT INTO message_read_status (message_id, user_id)
    SELECT m.id, p_user_id
    FROM messages m
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = p_user_id
    WHERE m.conversation_id = p_conversation_id 
    AND m.sender_id != p_user_id
    AND mrs.id IS NULL
    AND m.deleted_at IS NULL;
    
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    -- If messages were marked as read, broadcast the event
    IF message_count > 0 THEN
        PERFORM realtime.send(
            jsonb_build_object(
                'event', 'messages_read',
                'payload', jsonb_build_object(
                    'conversation_id', p_conversation_id,
                    'user_id', p_user_id,
                    'read_count', message_count,
                    'timestamp', extract(epoch from NOW()) * 1000
                )
            ),
            'messages_read',
            'conversation-' || p_conversation_id::text,
            false
        );
    END IF;
    
    RETURN message_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user presence with broadcast
CREATE OR REPLACE FUNCTION update_user_presence(
    p_status TEXT DEFAULT 'online',
    p_typing_in_conversation UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_presence user_presence%ROWTYPE;
    typing_changed BOOLEAN := FALSE;
BEGIN
    -- Get current presence
    SELECT * INTO old_presence FROM user_presence WHERE user_id = auth.uid();
    
    -- Upsert presence
    INSERT INTO user_presence (user_id, status, typing_in_conversation, typing_since, updated_at)
    VALUES (
        auth.uid(), 
        p_status, 
        p_typing_in_conversation,
        CASE WHEN p_typing_in_conversation IS NOT NULL THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        status = EXCLUDED.status,
        typing_in_conversation = EXCLUDED.typing_in_conversation,
        typing_since = EXCLUDED.typing_since,
        updated_at = EXCLUDED.updated_at;
    
    -- Check if typing status changed
    IF (old_presence.typing_in_conversation IS DISTINCT FROM p_typing_in_conversation) THEN
        typing_changed := TRUE;
        
        -- Broadcast typing status change
        IF p_typing_in_conversation IS NOT NULL THEN
            -- User started typing
            PERFORM realtime.send(
                jsonb_build_object(
                    'event', 'typing',
                    'payload', jsonb_build_object(
                        'user_id', auth.uid(),
                        'conversation_id', p_typing_in_conversation,
                        'timestamp', extract(epoch from NOW()) * 1000
                    )
                ),
                'typing',
                'conversation-' || p_typing_in_conversation::text,
                false
            );
        ELSIF old_presence.typing_in_conversation IS NOT NULL THEN
            -- User stopped typing
            PERFORM realtime.send(
                jsonb_build_object(
                    'event', 'stop_typing',
                    'payload', jsonb_build_object(
                        'user_id', auth.uid(),
                        'conversation_id', old_presence.typing_in_conversation,
                        'timestamp', extract(epoch from NOW()) * 1000
                    )
                ),
                'stop_typing',
                'conversation-' || old_presence.typing_in_conversation::text,
                false
            );
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS FOR AUTOMATIC BROADCASTS
-- =====================================================

-- Function to broadcast message events
CREATE OR REPLACE FUNCTION broadcast_message_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new message)
    IF TG_OP = 'INSERT' THEN
        PERFORM realtime.send(
            jsonb_build_object(
                'event', 'new_message',
                'payload', jsonb_build_object(
                    'message_id', NEW.id,
                    'conversation_id', NEW.conversation_id,
                    'sender_id', NEW.sender_id,
                    'content', NEW.content,
                    'message_type', NEW.message_type,
                    'created_at', NEW.created_at
                )
            ),
            'new_message',
            'conversation-' || NEW.conversation_id::text,
            false
        );
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (message edited or deleted)
    IF TG_OP = 'UPDATE' THEN
        -- Check if message was soft deleted
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            PERFORM realtime.send(
                jsonb_build_object(
                    'event', 'message_deleted',
                    'payload', jsonb_build_object(
                        'message_id', NEW.id,
                        'conversation_id', NEW.conversation_id,
                        'deleted_by', auth.uid(),
                        'timestamp', extract(epoch from NOW()) * 1000
                    )
                ),
                'message_deleted',
                'conversation-' || NEW.conversation_id::text,
                false
            );
        -- Check if message was edited
        ELSIF OLD.content != NEW.content AND NEW.is_edited = TRUE THEN
            PERFORM realtime.send(
                jsonb_build_object(
                    'event', 'message_edited',
                    'payload', jsonb_build_object(
                        'message_id', NEW.id,
                        'conversation_id', NEW.conversation_id,
                        'new_content', NEW.content,
                        'edited_at', NEW.updated_at
                    )
                ),
                'message_edited',
                'conversation-' || NEW.conversation_id::text,
                false
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for message broadcasts
DROP TRIGGER IF EXISTS trigger_broadcast_message_event ON messages;
CREATE TRIGGER trigger_broadcast_message_event
    AFTER INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_message_event();

-- =====================================================
-- 6. VIEWS FOR CONVENIENT DATA ACCESS
-- =====================================================

-- View for conversation list with last message
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
    c.id,
    c.title,
    c.type,
    c.created_by,
    c.created_at,
    c.updated_at,
    last_msg.content AS last_message_content,
    last_msg.created_at AS last_message_at,
    last_msg.sender_id AS last_message_sender_id,
    sender.username AS last_message_sender_username,
    COALESCE(unread.count, 0) AS unread_count,
    participants.participant_count,
    participants.participant_names
FROM conversations c
LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
    FROM messages 
    WHERE conversation_id = c.id AND deleted_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
) last_msg ON true
LEFT JOIN user_profiles sender ON last_msg.sender_id = sender.id
LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = auth.uid()
    WHERE m.conversation_id = c.id 
    AND m.sender_id != auth.uid()
    AND mrs.id IS NULL
    AND m.deleted_at IS NULL
) unread ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as participant_count,
        STRING_AGG(up.username, ', ') as participant_names
    FROM conversation_participants cp
    JOIN user_profiles up ON cp.user_id = up.id
    WHERE cp.conversation_id = c.id AND cp.left_at IS NULL
) participants ON true
WHERE c.id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND left_at IS NULL
);

-- View for message details with sender info
CREATE OR REPLACE VIEW message_details AS
SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.media_url,
    m.metadata,
    m.is_read,
    m.is_edited,
    m.reply_to,
    m.created_at,
    m.updated_at,
    sender.username AS sender_username,
    sender.avatar AS sender_avatar,
    CASE 
        WHEN mrs.id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END AS is_read_by_current_user,
    mrs.read_at
FROM messages m
JOIN user_profiles sender ON m.sender_id = sender.id
LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = auth.uid()
WHERE m.deleted_at IS NULL;

-- =====================================================
-- 7. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample test data only if no conversations exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM conversations LIMIT 1) THEN
        -- This will be populated by your app's registration system
        -- Just creating the structure here
        
        INSERT INTO conversations (id, title, type, created_by) VALUES
        ('00000000-0000-0000-0000-000000000001', 'Test Conversation', 'direct', (SELECT id FROM auth.users LIMIT 1))
        ON CONFLICT (id) DO NOTHING;
        
    END IF;
END
$$;

-- =====================================================
-- 8. REALTIME PUBLICATION SETUP
-- =====================================================

-- Enable realtime for tables (optional - only if using database changes)
-- Note: For pure broadcast messaging, this is not required
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE message_read_status;
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- =====================================================
-- 9. CLEANUP AND MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    UPDATE user_presence 
    SET 
        typing_in_conversation = NULL,
        typing_since = NULL
    WHERE typing_since < NOW() - INTERVAL '30 seconds';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old presence data
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    UPDATE user_presence 
    SET status = 'offline'
    WHERE last_seen < NOW() - INTERVAL '5 minutes' 
    AND status != 'offline';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
