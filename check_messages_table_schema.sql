-- =====================================================
-- CHECK MESSAGES TABLE SCHEMA
-- =====================================================
-- Run this first to see the actual column types in your messages table

-- Check all columns in messages table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check if messages table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'messages'
) as messages_table_exists;

-- Check specific columns we need
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('id', 'conversation_id', 'sender_id')
ORDER BY column_name;

-- Check if conversation_participants table exists and its structure
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'conversation_participants'
ORDER BY column_name;









