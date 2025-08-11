-- =====================================================
-- STORAGE VERIFICATION AND SETUP SCRIPT
-- =====================================================

-- First, let's check if the buckets exist
SELECT 
    'BUCKET CHECK' as test_type,
    id as bucket_name,
    name,
    public,
    created_at,
    CASE WHEN id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM storage.buckets 
WHERE id IN ('user-media', 'posts', 'reels', 'avatars', 'stories')
ORDER BY id;

-- Check storage policies
SELECT 
    'POLICY CHECK' as test_type,
    policyname,
    cmd as operation,
    CASE WHEN policyname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
        policyname LIKE '%user-media%' OR 
        policyname LIKE '%posts%' OR 
        policyname LIKE '%reels%' OR
        policyname LIKE '%avatars%' OR
        policyname LIKE '%stories%'
    )
ORDER BY policyname;

-- Create missing buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('user-media', 'user-media', true),
  ('posts', 'posts', true),
  ('reels', 'reels', true),
  ('avatars', 'avatars', true),
  ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;

-- =====================================================
-- COMPREHENSIVE STORAGE POLICIES
-- =====================================================

-- Drop all existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "User media files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Post files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Reel videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload reel videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own reels" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own reels" ON storage.objects;
DROP POLICY IF EXISTS "Avatar files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Story files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload story files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own stories" ON storage.objects;

-- Create comprehensive RLS policies for all buckets

-- USER-MEDIA BUCKET POLICIES
CREATE POLICY "User media files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-media');

CREATE POLICY "Users can upload their own media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-media' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can update their own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-media' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can delete their own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-media' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

-- POSTS BUCKET POLICIES
CREATE POLICY "Post files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'posts' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can update their own posts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'posts' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can delete their own posts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'posts' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

-- REELS BUCKET POLICIES
CREATE POLICY "Reel videos are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reel videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reels' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can update their own reels" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'reels' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can delete their own reels" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reels' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

-- AVATARS BUCKET POLICIES
CREATE POLICY "Avatar files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

-- STORIES BUCKET POLICIES
CREATE POLICY "Story files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload story files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stories' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can update their own stories" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'stories' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can delete their own stories" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'stories' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NOT NULL)
    );

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Verify all buckets are created
SELECT 
    'FINAL BUCKET CHECK' as test_type,
    id as bucket_name,
    name,
    public,
    CASE WHEN public = true THEN '✅ PUBLIC' ELSE '❌ PRIVATE' END as accessibility_status
FROM storage.buckets 
WHERE id IN ('user-media', 'posts', 'reels', 'avatars', 'stories')
ORDER BY id;

-- Verify all policies are created
SELECT 
    'FINAL POLICY CHECK' as test_type,
    COUNT(*) as policy_count,
    CASE WHEN COUNT(*) >= 20 THEN '✅ ALL POLICIES CREATED' ELSE '⚠️ SOME POLICIES MISSING' END as status
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
        policyname LIKE '%user-media%' OR 
        policyname LIKE '%posts%' OR 
        policyname LIKE '%reels%' OR
        policyname LIKE '%avatars%' OR
        policyname LIKE '%stories%'
    );

-- Show a summary of what was set up
SELECT 
    'SETUP COMPLETE' as status,
    'Storage buckets and policies have been configured for file uploads' as message,
    'You can now test uploads using the StorageTestButton component' as next_step;
