-- Comprehensive fix for message_type references
-- This will find and remove ALL references to message_type

-- First, let's see what triggers exist on the messages table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'messages';

-- Drop ALL possible triggers on messages table
DROP TRIGGER IF EXISTS update_conversation_updated_at ON messages;
DROP TRIGGER IF EXISTS broadcast_message_changes ON messages;
DROP TRIGGER IF EXISTS update_message_timestamp ON messages;
DROP TRIGGER IF EXISTS handle_message_insert ON messages;
DROP TRIGGER IF EXISTS handle_message_update ON messages;
DROP TRIGGER IF EXISTS handle_message_delete ON messages;

-- Drop ALL functions that might reference message_type
DROP FUNCTION IF EXISTS update_conversation_updated_at() CASCADE;
DROP FUNCTION IF EXISTS broadcast_message_changes() CASCADE;
DROP FUNCTION IF EXISTS update_message_timestamp() CASCADE;
DROP FUNCTION IF EXISTS handle_message_insert() CASCADE;
DROP FUNCTION IF EXISTS handle_message_update() CASCADE;
DROP FUNCTION IF EXISTS handle_message_delete() CASCADE;
DROP FUNCTION IF EXISTS broadcast_changes() CASCADE;

-- Check if there are any views that reference message_type
DROP VIEW IF EXISTS message_details CASCADE;

-- Recreate the conversation updated_at trigger (simple version)
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_updated_at
    AFTER INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Create a simple message_details view without message_type
CREATE OR REPLACE VIEW message_details AS
SELECT 
    m.id,
    m.content,
    m.sender_id,
    m.conversation_id,
    m.created_at,
    m.updated_at,
    up.username as sender_username
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id;

-- Verify the messages table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
