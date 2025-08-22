-- Check the exact structure of conversation_participants table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversation_participants'
ORDER BY ordinal_position;
