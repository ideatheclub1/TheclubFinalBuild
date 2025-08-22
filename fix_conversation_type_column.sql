-- =====================================================
-- FIX: Add missing conversation_type column to conversations table
-- =====================================================
-- Run this in your Supabase SQL Editor to fix the error:
-- "Could not find the 'conversation_type' column of 'conversations' in the schema cache"

-- Check if the conversations table exists and add the missing column
DO $$
BEGIN
    -- Check if conversations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
        
        -- Add conversation_type column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'conversation_type' AND table_schema = 'public') THEN
            ALTER TABLE conversations ADD COLUMN conversation_type TEXT DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group'));
            RAISE NOTICE '✅ Added conversation_type column to conversations table';
        ELSE
            RAISE NOTICE 'ℹ️ conversation_type column already exists in conversations table';
        END IF;
        
        -- Also add title column if missing (for completeness)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'title' AND table_schema = 'public') THEN
            ALTER TABLE conversations ADD COLUMN title TEXT;
            RAISE NOTICE '✅ Added title column to conversations table';
        ELSE
            RAISE NOTICE 'ℹ️ title column already exists in conversations table';
        END IF;
        
        -- Add created_by column if missing (for user tracking)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'created_by' AND table_schema = 'public') THEN
            ALTER TABLE conversations ADD COLUMN created_by UUID REFERENCES user_profiles(id);
            RAISE NOTICE '✅ Added created_by column to conversations table';
        ELSE
            RAISE NOTICE 'ℹ️ created_by column already exists in conversations table';
        END IF;
        
    ELSE
        RAISE NOTICE 'ℹ️ conversations table does not exist - creating it with the correct schema';
        -- Create the complete conversations table if it doesn't exist
        CREATE TABLE conversations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT,
            conversation_type TEXT DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
            created_by UUID REFERENCES user_profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created conversations table with conversation_type column';
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);

-- Verify the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'conversation_type' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ SUCCESS: conversation_type column verified in conversations table';
    ELSE
        RAISE EXCEPTION '❌ ERROR: conversation_type column still missing from conversations table';
    END IF;
END $$;

-- Show current conversations table schema for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
