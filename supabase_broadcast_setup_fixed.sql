-- =====================================================
-- SUPABASE BROADCAST MESSAGING SETUP (FIXED)
-- Compatible with existing "The Club" database schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. MESSAGING TABLES (Enhanced for Broadcast - Fixed References)
-- =====================================================

-- Check if conversations table exists and has the right structure
DO $$
BEGIN
    -- Add missing columns to existing conversations table if they don't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
        -- Add title column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'title' AND table_schema = 'public') THEN
            ALTER TABLE conversations ADD COLUMN title TEXT;
        END IF;
        
        -- Add type column if missing (rename from conversation_type if exists)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'type' AND table_schema = 'public') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'conversation_type' AND table_schema = 'public') THEN
                ALTER TABLE conversations RENAME COLUMN conversation_type TO type;
            ELSE
                ALTER TABLE conversations ADD COLUMN type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group'));
            END IF;
        END IF;
        
        -- Add created_by column if missing (reference to user_profiles, not auth.users)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'created_by' AND table_schema = 'public') THEN
            ALTER TABLE conversations ADD COLUMN created_by UUID REFERENCES user_profiles(id);
        END IF;
        
        -- Ensure updated_at exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'updated_at' AND table_schema = 'public') THEN
            ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    ELSE
        -- Create conversations table from scratch
        CREATE TABLE conversations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT,
            type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
            created_by UUID REFERENCES user_profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END
$$;

-- Create conversation participants table (enhanced)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_participants' AND table_schema = 'public') THEN
        -- Create table from scratch
        CREATE TABLE conversation_participants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            left_at TIMESTAMP WITH TIME ZONE,
            role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
            UNIQUE(conversation_id, user_id)
        );
    ELSE
        -- Add missing columns to existing table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'left_at' AND table_schema = 'public') THEN
            ALTER TABLE conversation_participants ADD COLUMN left_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'role' AND table_schema = 'public') THEN
            ALTER TABLE conversation_participants ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'joined_at' AND table_schema = 'public') THEN
            ALTER TABLE conversation_participants ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END
$$;

-- Check if messages table exists and enhance it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        -- Add missing columns to existing messages table
        
        -- Add metadata column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'metadata' AND table_schema = 'public') THEN
            ALTER TABLE messages ADD COLUMN metadata JSONB;
        END IF;
        
        -- Add is_edited column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_edited' AND table_schema = 'public') THEN
            ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Add reply_to column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to' AND table_schema = 'public') THEN
            ALTER TABLE messages ADD COLUMN reply_to UUID REFERENCES messages(id);
        END IF;
        
        -- Add updated_at column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at' AND table_schema = 'public') THEN
            ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- Add deleted_at column if missing (for soft deletes)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'deleted_at' AND table_schema = 'public') THEN
            ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Ensure sender_id has correct foreign key reference
        -- Drop any existing foreign key constraint and recreate with correct reference
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_sender;
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_sender_id;
        
        -- Add the correct foreign key constraint
        ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey 
            FOREIGN KEY (sender_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        
    ELSE
        -- Create messages table from scratch
        CREATE TABLE messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
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
    END IF;
END
$$;

-- Message read status (for detailed read receipts)
CREATE TABLE IF NOT EXISTS message_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- User presence (for online status and typing indicators)
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

-- Create conditional index only if left_at column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'left_at' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON conversation_participants(conversation_id, user_id) WHERE left_at IS NULL;
    END IF;
END
$$;

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Create conditional indexes only if columns exist
DO $$
BEGIN
    -- Index for non-deleted messages
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'deleted_at' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
    END IF;
    
    -- Index for unread messages
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;
    END IF;
END
$$;

-- Read status indexes
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- Presence indexes
DO $$
BEGIN
    -- Basic indexes that should always work
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
        CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);
        
        -- Conditional index for typing
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'typing_in_conversation' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_user_presence_typing ON user_presence(typing_in_conversation) WHERE typing_in_conversation IS NOT NULL;
        END IF;
    END IF;
END
$$;

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Conversation creators and admins can update" ON conversations;

-- Conversations policies (fixed to avoid recursion)
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        created_by = (SELECT id FROM user_profiles WHERE id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
            AND (cp.left_at IS NULL OR cp.left_at > NOW())
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        created_by = (
            SELECT id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Conversation creators and admins can update" ON conversations
    FOR UPDATE USING (
        created_by = (SELECT id FROM user_profiles WHERE id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
            AND cp.role = 'admin' 
            AND (cp.left_at IS NULL OR cp.left_at > NOW())
        )
    );

-- Participants policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
    FOR SELECT USING (
        user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp2
            WHERE cp2.conversation_id = conversation_participants.conversation_id 
            AND cp2.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
            AND (cp2.left_at IS NULL OR cp2.left_at > NOW())
        )
    );

CREATE POLICY "Users can join conversations" ON conversation_participants
    FOR INSERT WITH CHECK (
        user_id = (
            SELECT id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can leave conversations" ON conversation_participants
    FOR UPDATE USING (
        user_id = (
            SELECT id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        (deleted_at IS NULL OR deleted_at > NOW())
        AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
            AND (cp.left_at IS NULL OR cp.left_at > NOW())
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
        AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
            AND (cp.left_at IS NULL OR cp.left_at > NOW())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (
        sender_id = (
            SELECT id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Read status policies
DROP POLICY IF EXISTS "Users can view read status for their conversations" ON message_read_status;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_read_status;

CREATE POLICY "Users can view read status for their conversations" ON message_read_status
    FOR SELECT USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = (
                SELECT id FROM user_profiles 
                WHERE id = auth.uid()
            ) AND cp.left_at IS NULL
        )
    );

CREATE POLICY "Users can mark messages as read" ON message_read_status
    FOR INSERT WITH CHECK (
        user_id = (
            SELECT id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Presence policies
DROP POLICY IF EXISTS "Users can view presence of conversation participants" ON user_presence;
DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;

CREATE POLICY "Users can view presence of conversation participants" ON user_presence
    FOR SELECT USING (
        user_id IN (
            SELECT DISTINCT cp2.user_id
            FROM conversation_participants cp1
            JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = (
                SELECT id FROM user_profiles 
                WHERE id = auth.uid()
            ) AND cp1.left_at IS NULL AND cp2.left_at IS NULL
        )
    );

CREATE POLICY "Users can update their own presence" ON user_presence
    FOR ALL USING (
        user_id = (
            SELECT id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 4. FUNCTIONS FOR BROADCAST MESSAGING (Fixed References)
-- =====================================================

-- Function to get current user ID from auth context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    current_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT get_current_user_id() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Create the conversation
    INSERT INTO conversations (title, type, created_by)
    VALUES (conversation_title, conversation_type, current_user_id)
    RETURNING id INTO new_conversation_id;
    
    -- Add the creator as a participant
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (new_conversation_id, current_user_id, 'admin');
    
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

-- Function to send a message with broadcast (using Supabase realtime.send if available)
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
    new_message messages%ROWTYPE;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT get_current_user_id() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Insert the message
    INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url, metadata)
    VALUES (p_conversation_id, current_user_id, p_content, p_message_type, p_media_url, p_metadata)
    RETURNING * INTO new_message;
    
    -- Update conversation timestamp
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = p_conversation_id;
    
    -- Try to send broadcast notification (this will work if realtime extension is available)
    BEGIN
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
    EXCEPTION
        WHEN undefined_function THEN
            -- realtime.send not available, continue without broadcast
            NULL;
    END;
    
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
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    message_count INTEGER;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT get_current_user_id() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Use provided user_id or current user
    IF p_user_id IS NULL THEN
        p_user_id := current_user_id;
    END IF;
    
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
    
    -- If messages were marked as read, try to broadcast the event
    IF message_count > 0 THEN
        BEGIN
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
        EXCEPTION
            WHEN undefined_function THEN
                -- realtime.send not available, continue without broadcast
                NULL;
        END;
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
    current_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT get_current_user_id() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get current presence
    SELECT * INTO old_presence FROM user_presence WHERE user_id = current_user_id;
    
    -- Upsert presence
    INSERT INTO user_presence (user_id, status, typing_in_conversation, typing_since, updated_at)
    VALUES (
        current_user_id, 
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
        
        -- Try to broadcast typing status change
        BEGIN
            IF p_typing_in_conversation IS NOT NULL THEN
                -- User started typing
                PERFORM realtime.send(
                    jsonb_build_object(
                        'event', 'typing',
                        'payload', jsonb_build_object(
                            'user_id', current_user_id,
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
                            'user_id', current_user_id,
                            'conversation_id', old_presence.typing_in_conversation,
                            'timestamp', extract(epoch from NOW()) * 1000
                        )
                    ),
                    'stop_typing',
                    'conversation-' || old_presence.typing_in_conversation::text,
                    false
                );
            END IF;
        EXCEPTION
            WHEN undefined_function THEN
                -- realtime.send not available, continue without broadcast
                NULL;
        END;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS FOR AUTOMATIC BROADCASTS (Optional)
-- =====================================================

-- Function to broadcast message events
CREATE OR REPLACE FUNCTION broadcast_message_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new message)
    IF TG_OP = 'INSERT' THEN
        BEGIN
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
        EXCEPTION
            WHEN undefined_function THEN
                -- realtime.send not available, continue without broadcast
                NULL;
        END;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (message edited or deleted)
    IF TG_OP = 'UPDATE' THEN
        BEGIN
            -- Check if message was soft deleted
            IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
                PERFORM realtime.send(
                    jsonb_build_object(
                        'event', 'message_deleted',
                        'payload', jsonb_build_object(
                            'message_id', NEW.id,
                            'conversation_id', NEW.conversation_id,
                            'deleted_by', get_current_user_id(),
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
        EXCEPTION
            WHEN undefined_function THEN
                -- realtime.send not available, continue without broadcast
                NULL;
        END;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for message broadcasts (only if not exists)
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
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id 
        AND mrs.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())
    WHERE m.conversation_id = c.id 
    AND m.sender_id != (SELECT id FROM user_profiles WHERE id = auth.uid())
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
    WHERE user_id = (SELECT id FROM user_profiles WHERE id = auth.uid()) 
    AND left_at IS NULL
);

-- View for message details with sender info (create conditionally based on available columns)
DO $$
DECLARE
    has_message_type BOOLEAN;
    has_media_url BOOLEAN;
    has_metadata BOOLEAN;
    has_is_read BOOLEAN;
    has_is_edited BOOLEAN;
    has_reply_to BOOLEAN;
    has_updated_at BOOLEAN;
    has_deleted_at BOOLEAN;
    view_sql TEXT;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type' AND table_schema = 'public') INTO has_message_type;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_url' AND table_schema = 'public') INTO has_media_url;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'metadata' AND table_schema = 'public') INTO has_metadata;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read' AND table_schema = 'public') INTO has_is_read;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_edited' AND table_schema = 'public') INTO has_is_edited;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to' AND table_schema = 'public') INTO has_reply_to;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at' AND table_schema = 'public') INTO has_updated_at;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'deleted_at' AND table_schema = 'public') INTO has_deleted_at;
    
    -- Build the view SQL dynamically
    view_sql := 'CREATE OR REPLACE VIEW message_details AS SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,';
    
    -- Add conditional columns
    IF has_message_type THEN
        view_sql := view_sql || '
        m.message_type,';
    ELSE
        view_sql := view_sql || '
        ''text''::TEXT AS message_type,';
    END IF;
    
    IF has_media_url THEN
        view_sql := view_sql || '
        m.media_url,';
    ELSE
        view_sql := view_sql || '
        NULL::TEXT AS media_url,';
    END IF;
    
    IF has_metadata THEN
        view_sql := view_sql || '
        m.metadata,';
    ELSE
        view_sql := view_sql || '
        NULL::JSONB AS metadata,';
    END IF;
    
    IF has_is_read THEN
        view_sql := view_sql || '
        m.is_read,';
    ELSE
        view_sql := view_sql || '
        FALSE AS is_read,';
    END IF;
    
    IF has_is_edited THEN
        view_sql := view_sql || '
        m.is_edited,';
    ELSE
        view_sql := view_sql || '
        FALSE AS is_edited,';
    END IF;
    
    IF has_reply_to THEN
        view_sql := view_sql || '
        m.reply_to,';
    ELSE
        view_sql := view_sql || '
        NULL::UUID AS reply_to,';
    END IF;
    
    view_sql := view_sql || '
        m.created_at,';
    
    IF has_updated_at THEN
        view_sql := view_sql || '
        m.updated_at,';
    ELSE
        view_sql := view_sql || '
        m.created_at AS updated_at,';
    END IF;
    
    view_sql := view_sql || '
        sender.username AS sender_username,
        sender.avatar AS sender_avatar,
        CASE 
            WHEN mrs.id IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS is_read_by_current_user,
        mrs.read_at
    FROM messages m
    JOIN user_profiles sender ON m.sender_id = sender.id
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id 
        AND mrs.user_id = (SELECT id FROM user_profiles WHERE id = auth.uid())';
    
    -- Add WHERE clause if deleted_at exists
    IF has_deleted_at THEN
        view_sql := view_sql || '
    WHERE m.deleted_at IS NULL';
    END IF;
    
    -- Execute the dynamic SQL
    EXECUTE view_sql;
    
END
$$;

-- =====================================================
-- 7. CLEANUP AND MAINTENANCE FUNCTIONS
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
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- 9. FINAL VERIFICATION
-- =====================================================

-- Verify setup
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'conversations', 
        'conversation_participants', 
        'messages', 
        'message_read_status', 
        'user_presence'
    );
    
    -- Check functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN (
        'create_conversation',
        'send_message_with_broadcast',
        'mark_messages_read_with_broadcast',
        'update_user_presence'
    );
    
    RAISE NOTICE '✅ Broadcast messaging setup complete!';
    RAISE NOTICE '📊 Tables created: %', table_count;
    RAISE NOTICE '🔧 Functions created: %', function_count;
    RAISE NOTICE '🚀 Ready for real-time messaging!';
END
$$;
