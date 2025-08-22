-- =====================================================
-- MESSAGING DATABASE FUNCTIONS
-- =====================================================

-- Function to find existing direct conversation between two users
CREATE OR REPLACE FUNCTION find_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS TABLE(id UUID, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.created_at
  FROM conversations c
  WHERE c.conversation_type = 'direct'
    AND c.id IN (
      SELECT cp1.conversation_id
      FROM conversation_participants cp1
      WHERE cp1.user_id = user1_id
    )
    AND c.id IN (
      SELECT cp2.conversation_id
      FROM conversation_participants cp2
      WHERE cp2.user_id = user2_id
    )
    AND (
      SELECT COUNT(*)
      FROM conversation_participants cp3
      WHERE cp3.conversation_id = c.id
    ) = 2;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation with unread count
CREATE OR REPLACE FUNCTION get_conversation_with_unread(conv_id UUID, user_id UUID)
RETURNS TABLE(
  conversation_id UUID,
  unread_count BIGINT,
  last_message_content TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    conv_id as conversation_id,
    (
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = conv_id
        AND m.sender_id != user_id
        AND m.is_read = false
    ) as unread_count,
    (
      SELECT m.content
      FROM messages m
      WHERE m.conversation_id = conv_id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) as last_message_content,
    (
      SELECT m.created_at
      FROM messages m
      WHERE m.conversation_id = conv_id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) as last_message_time;
END;
$$ LANGUAGE plpgsql;

-- Function to mark conversation messages as read
CREATE OR REPLACE FUNCTION mark_conversation_read(conv_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conv_id
    AND sender_id != user_id
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's conversations with details
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE(
  conversation_id UUID,
  conversation_type TEXT,
  conversation_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  participant_id UUID,
  participant_username TEXT,
  participant_avatar TEXT,
  participant_full_name TEXT,
  participant_is_online BOOLEAN,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    SELECT DISTINCT c.id, c.conversation_type, c.title, c.created_at, c.updated_at
    FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = user_id
  ),
  latest_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.id as message_id,
      m.content,
      m.sender_id,
      m.created_at as message_created_at
    FROM messages m
    INNER JOIN user_conversations uc ON m.conversation_id = uc.id
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_count
    FROM messages m
    INNER JOIN user_conversations uc ON m.conversation_id = uc.id
    WHERE m.sender_id != user_id AND m.is_read = false
    GROUP BY m.conversation_id
  )
  SELECT 
    uc.id as conversation_id,
    uc.conversation_type,
    uc.title as conversation_title,
    uc.created_at,
    uc.updated_at,
    up.id as participant_id,
    COALESCE(up.username, up.handle, '') as participant_username,
    COALESCE(up.avatar, up.profile_picture, '') as participant_avatar,
    COALESCE(up.full_name, '') as participant_full_name,
    COALESCE(up.is_online, false) as participant_is_online,
    lm.message_id as last_message_id,
    COALESCE(lm.content, 'No messages yet') as last_message_content,
    lm.sender_id as last_message_sender_id,
    lm.message_created_at as last_message_created_at,
    COALESCE(unc.unread_count, 0) as unread_count
  FROM user_conversations uc
  LEFT JOIN latest_messages lm ON uc.id = lm.conversation_id
  LEFT JOIN unread_counts unc ON uc.id = unc.conversation_id
  LEFT JOIN conversation_participants cp ON uc.id = cp.conversation_id AND cp.user_id != user_id
  LEFT JOIN user_profiles up ON cp.user_id = up.id
  ORDER BY COALESCE(lm.message_created_at, uc.updated_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);