-- Aggressive RLS Policy Fix for Infinite Recursion
-- This script completely removes and recreates all RLS policies to eliminate circular references

-- First, disable RLS temporarily to avoid issues during policy updates
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on conversations table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON conversations', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on conversation_participants table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversation_participants' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON conversation_participants', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on messages table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on user_presence table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_presence' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_presence', policy_record.policyname);
    END LOOP;
END $$;

-- Create a simple helper function to get current user profile ID
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for conversations
CREATE POLICY "conversations_select" ON conversations
    FOR SELECT USING (
        get_user_profile_id() IN (
            SELECT user_id 
            FROM conversation_participants cp 
            WHERE cp.conversation_id = conversations.id
        )
    );

CREATE POLICY "conversations_insert" ON conversations
    FOR INSERT WITH CHECK (created_by = get_user_profile_id());

CREATE POLICY "conversations_update" ON conversations
    FOR UPDATE USING (created_by = get_user_profile_id());

CREATE POLICY "conversations_delete" ON conversations
    FOR DELETE USING (created_by = get_user_profile_id());

-- Create simple, non-recursive policies for conversation_participants
CREATE POLICY "participants_select" ON conversation_participants
    FOR SELECT USING (user_id = get_user_profile_id());

CREATE POLICY "participants_insert" ON conversation_participants
    FOR INSERT WITH CHECK (user_id = get_user_profile_id());

CREATE POLICY "participants_update" ON conversation_participants
    FOR UPDATE USING (user_id = get_user_profile_id());

CREATE POLICY "participants_delete" ON conversation_participants
    FOR DELETE USING (user_id = get_user_profile_id());

-- Create simple, non-recursive policies for messages
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
        sender_id = get_user_profile_id() OR
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = get_user_profile_id()
        )
    );

CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (
        sender_id = get_user_profile_id() AND
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = get_user_profile_id()
        )
    );

CREATE POLICY "messages_update" ON messages
    FOR UPDATE USING (sender_id = get_user_profile_id());

CREATE POLICY "messages_delete" ON messages
    FOR DELETE USING (sender_id = get_user_profile_id());

-- Create simple policies for user_presence
CREATE POLICY "presence_select" ON user_presence
    FOR SELECT USING (
        user_id = get_user_profile_id() OR
        typing_in_conversation IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = get_user_profile_id()
        )
    );

CREATE POLICY "presence_insert" ON user_presence
    FOR INSERT WITH CHECK (user_id = get_user_profile_id());

CREATE POLICY "presence_update" ON user_presence
    FOR UPDATE USING (user_id = get_user_profile_id());

CREATE POLICY "presence_delete" ON user_presence
    FOR DELETE USING (user_id = get_user_profile_id());

-- Test the policies by doing a simple query
DO $$
BEGIN
    RAISE NOTICE 'RLS policies have been recreated successfully';
    RAISE NOTICE 'Testing basic access...';
    
    -- Test if we can access the tables without recursion
    PERFORM 1 FROM conversations LIMIT 1;
    PERFORM 1 FROM conversation_participants LIMIT 1;
    PERFORM 1 FROM messages LIMIT 1;
    PERFORM 1 FROM user_presence LIMIT 1;
    
    RAISE NOTICE 'All tables are accessible - RLS fix complete!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error during RLS test: %', SQLERRM;
END $$;
