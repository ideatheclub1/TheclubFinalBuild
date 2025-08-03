-- =====================================================
-- SUPABASE STORAGE SETUP FOR PHOTOS & VIDEOS (SIMPLIFIED)
-- =====================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('user-media', 'user-media', true),
  ('reels', 'reels', true),
  ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES FOR USER-MEDIA BUCKET
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "User media files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;

-- Create RLS policies for user-media bucket
CREATE POLICY "User media files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-media');

CREATE POLICY "Users can upload their own media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- STORAGE POLICIES FOR POSTS BUCKET
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Post files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own posts" ON storage.objects;

-- Create RLS policies for posts bucket
CREATE POLICY "Post files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'posts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own posts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'posts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own posts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'posts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- STORAGE POLICIES FOR REELS BUCKET
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Reel videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload reel videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own reels" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own reels" ON storage.objects;

-- Create RLS policies for reels bucket
CREATE POLICY "Reel videos are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reel videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reels' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own reels" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'reels' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own reels" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reels' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if buckets were created
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('user-media', 'reels', 'posts');

-- Check if policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%user-media%' OR policyname LIKE '%reel%')
ORDER BY policyname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This simplified script sets up:
-- 1. Storage buckets for user media and reels
-- 2. RLS policies for secure file access
-- 3. No optional metadata table (to avoid column conflicts)

-- Your PhotosVideosScreen should now be able to:
-- - Upload images and videos to the user-media bucket
-- - List user's media files
-- - Delete user's media files
-- - Display media with proper URLs

-- Test the setup by uploading a file through your app! 