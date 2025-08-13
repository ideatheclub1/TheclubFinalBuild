-- Temporarily disable ALL triggers on messages table to isolate message_type issue

-- First, let's see ALL triggers on the messages table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'messages';

-- Disable ALL triggers on messages table
ALTER TABLE messages DISABLE TRIGGER ALL;

-- Now let's try to insert a test message to see if it works
INSERT INTO messages (content, sender_id, conversation_id) 
VALUES ('Test message', '972be8f0-272f-405d-a278-5b68fa0302a4', '4682a89b-0db2-4c56-843f-fc0268db137e')
RETURNING id, content, sender_id, conversation_id, created_at;

-- If that works, let's re-enable only the essential trigger
ALTER TABLE messages ENABLE TRIGGER ALL;

-- Drop and recreate only the conversation updated_at trigger
DROP TRIGGER IF EXISTS update_conversation_updated_at ON messages;
DROP FUNCTION IF EXISTS update_conversation_updated_at() CASCADE;

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

-- Check what triggers are now active
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'messages';
