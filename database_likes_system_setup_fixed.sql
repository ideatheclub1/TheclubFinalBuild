-- =====================================================
-- LIKES SYSTEM SETUP FOR FEED POSTS (FIXED VERSION)
-- =====================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENSURE LIKES TABLE EXISTS WITH PROPER STRUCTURE
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    post_id UUID,
    comment_id UUID,
    reel_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one of post_id, comment_id, or reel_id is set
    CONSTRAINT likes_content_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL AND reel_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL AND reel_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NULL AND reel_id IS NOT NULL)
    )
);

-- 2. CREATE FOREIGN KEY RELATIONSHIPS
-- Drop existing foreign keys if they exist
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_comment_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_reel_id_fkey;

-- Add foreign key constraints - FIXED: Link to user_profiles instead of auth.users
ALTER TABLE likes 
    ADD CONSTRAINT likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE likes 
    ADD CONSTRAINT likes_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE likes 
    ADD CONSTRAINT likes_comment_id_fkey 
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;

ALTER TABLE likes 
    ADD CONSTRAINT likes_reel_id_fkey 
    FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE;

-- 3. CREATE UNIQUE INDEXES TO PREVENT DUPLICATE LIKES
-- Drop existing indexes if they exist
DROP INDEX IF EXISTS unique_user_post_like;
DROP INDEX IF EXISTS unique_user_comment_like;
DROP INDEX IF EXISTS unique_user_reel_like;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_post_like 
ON likes (user_id, post_id) 
WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_comment_like 
ON likes (user_id, comment_id) 
WHERE comment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_reel_like 
ON likes (user_id, reel_id) 
WHERE reel_id IS NOT NULL;

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_likes_reel_id ON likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at DESC);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES FOR LIKES
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

-- Allow users to view all likes (for feed display)
CREATE POLICY "Users can view all likes" ON likes
    FOR SELECT USING (true);

-- Allow users to create their own likes
CREATE POLICY "Users can create their own likes" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes (unlike)
CREATE POLICY "Users can delete their own likes" ON likes
    FOR DELETE USING (auth.uid() = user_id);

-- 7. INSERT SAMPLE DATA FOR TESTING
-- Insert sample users if they don't exist
INSERT INTO user_profiles (id, username, handle, full_name, bio, avatar) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'sarah_j', 'sarahj', 'Sarah Johnson', 'Professional life coach', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'),
('550e8400-e29b-41d4-a716-446655440002', 'mike_chen', 'mikechen', 'Michael Chen', 'Experienced mentor', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'),
('550e8400-e29b-41d4-a716-446655440003', 'emma_davis', 'emmadavis', 'Emma Davis', 'Compassionate listener', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg')
ON CONFLICT (id) DO NOTHING;

-- Insert sample posts if they don't exist
INSERT INTO posts (id, user_id, content, image_url) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Just finished an amazing coaching session!', NULL),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Being a father figure isn\'t about having all the answers.', NULL),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Sometimes the best therapy is just having someone who truly listens.', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert sample likes
INSERT INTO likes (user_id, post_id) VALUES
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003')
ON CONFLICT (user_id, post_id) DO NOTHING;

-- 8. VERIFICATION QUERIES
-- Check if likes table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'likes' 
ORDER BY ordinal_position;

-- Check foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='likes';

-- Check sample data
SELECT 
    l.id as like_id,
    l.user_id,
    l.post_id,
    up.username,
    p.content as post_content,
    l.created_at
FROM likes l
JOIN user_profiles up ON l.user_id = up.id
JOIN posts p ON l.post_id = p.id
ORDER BY l.created_at DESC;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'likes'
ORDER BY policyname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This script sets up:
-- 1. ✅ Likes table with proper structure
-- 2. ✅ Foreign key relationships to user_profiles (FIXED)
-- 3. ✅ Unique constraints to prevent duplicate likes
-- 4. ✅ Performance indexes for fast queries
-- 5. ✅ Row Level Security policies
-- 6. ✅ Sample data for testing
-- 7. ✅ Verification queries to confirm setup

-- Your likes system should now work properly with:
-- - Frontend can fetch likes for posts
-- - Users can like/unlike posts
-- - Proper security and performance
-- - Sample data to test with

-- Test the setup by running the verification queries above! 