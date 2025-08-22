-- Check if messages table has the required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('shared_reel_id', 'shared_post_id', 'message_type');

-- Check if there are any reel messages in the database
SELECT COUNT(*) as reel_message_count
FROM messages 
WHERE message_type = 'reel' OR shared_reel_id IS NOT NULL;

-- Check if there are any reels in the reels table
SELECT COUNT(*) as total_reels
FROM reels;

-- Check a sample of recent messages
SELECT id, message_type, content, shared_reel_id, shared_post_id, created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;









