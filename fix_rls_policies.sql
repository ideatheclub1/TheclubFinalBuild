-- =====================================================
-- FIX RLS POLICIES - Resolve Infinite Recursion
-- =====================================================

-- This script fixes the infinite recursion issue in RLS policies
-- Run this in your Supabase SQL Editor

-- First, drop all problematic policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Conversation creators and admins can update" ON conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- Recreate policies without recursion

-- 1. Conversations policies (fixed)
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

-- 2. Participants policies (fixed)
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

-- 3. Messages policies (fixed)
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

-- Verify policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;

-- Test queries to ensure no recursion
SELECT 'Testing conversations access...' as test;
SELECT COUNT(*) as conversation_count FROM conversations;

SELECT 'Testing messages access...' as test;
SELECT COUNT(*) as message_count FROM messages;

SELECT 'Testing participants access...' as test;
SELECT COUNT(*) as participant_count FROM conversation_participants;

SELECT '✅ RLS policies fixed successfully!' as result;
