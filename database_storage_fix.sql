-- =====================================================
-- COMPLETE STORAGE SETUP AND FIX FOR THE CLUB APP
-- =====================================================

-- This script will:
-- 1. Create all necessary storage buckets
-- 2. Set up proper RLS policies for public access
-- 3. Fix any existing permission issues
-- 4. Verify the setup

-- =====================================================
-- STEP 1: CREATE STORAGE BUCKETS
-- =====================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),  -- 5MB limit
  ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),    -- 10MB limit
  ('stories', 'stories', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']), -- 5MB limit
  ('reels', 'reels', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime']), -- 50MB limit
  ('user-media', 'user-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']) -- 10MB limit
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 2: DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- =====================================================

-- Drop all existing storage policies to avoid conflicts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND (
            policyname LIKE '%avatar%' OR 
            policyname LIKE '%post%' OR 
            policyname LIKE '%story%' OR 
            policyname LIKE '%reel%' OR 
            policyname LIKE '%user-media%' OR
            policyname LIKE '%User media%' OR
            policyname LIKE '%Post%' OR
            policyname LIKE '%Story%' OR
            policyname LIKE '%Reel%'
        )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: CREATE COMPREHENSIVE RLS POLICIES
-- =====================================================

-- AVATARS BUCKET POLICIES
CREATE POLICY "Public access for avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- POSTS BUCKET POLICIES
CREATE POLICY "Public access for posts" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload posts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'posts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their posts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'posts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their posts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'posts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- STORIES BUCKET POLICIES
CREATE POLICY "Public access for stories" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload stories" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stories' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their stories" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'stories' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their stories" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'stories' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- REELS BUCKET POLICIES
CREATE POLICY "Public access for reels" ON storage.objects
    FOR SELECT USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reels" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reels' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their reels" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'reels' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their reels" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reels' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- USER-MEDIA BUCKET POLICIES
CREATE POLICY "Public access for user media" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-media');

CREATE POLICY "Users can upload user media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their user media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their user media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- STEP 4: EMERGENCY FALLBACK POLICIES (TEMPORARY)
-- =====================================================

-- If the above policies don't work, these provide broader access
-- Remove these after confirming the main policies work

CREATE POLICY "Emergency public read access" ON storage.objects
    FOR SELECT USING (bucket_id IN ('avatars', 'posts', 'stories', 'reels', 'user-media'));

-- =====================================================
-- STEP 5: VERIFICATION AND TESTING
-- =====================================================

-- Check if buckets were created successfully
DO $$
DECLARE
    bucket_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count buckets
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets 
    WHERE id IN ('avatars', 'posts', 'stories', 'reels', 'user-media');
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
        policyname LIKE '%avatar%' OR 
        policyname LIKE '%post%' OR 
        policyname LIKE '%story%' OR 
        policyname LIKE '%reel%' OR 
        policyname LIKE '%user%media%' OR
        policyname LIKE '%Emergency%'
    );
    
    RAISE NOTICE 'Storage setup completed:';
    RAISE NOTICE '- Buckets created: %', bucket_count;
    RAISE NOTICE '- Policies created: %', policy_count;
    
    IF bucket_count = 5 THEN
        RAISE NOTICE '✅ All required buckets are present';
    ELSE
        RAISE WARNING '⚠️  Missing buckets! Expected 5, found %', bucket_count;
    END IF;
    
    IF policy_count >= 20 THEN
        RAISE NOTICE '✅ Storage policies configured';
    ELSE
        RAISE WARNING '⚠️  Not enough policies! Expected 20+, found %', policy_count;
    END IF;
END $$;

-- List all buckets for verification
SELECT 
    id as bucket_name,
    name,
    public,
    file_size_limit / 1024 / 1024 as max_size_mb,
    created_at
FROM storage.buckets 
WHERE id IN ('avatars', 'posts', 'stories', 'reels', 'user-media')
ORDER BY id;

-- List all policies for verification
SELECT 
    policyname,
    cmd as permission,
    CASE 
        WHEN qual LIKE '%avatars%' THEN 'avatars'
        WHEN qual LIKE '%posts%' THEN 'posts'
        WHEN qual LIKE '%stories%' THEN 'stories'
        WHEN qual LIKE '%reels%' THEN 'reels'
        WHEN qual LIKE '%user-media%' THEN 'user-media'
        ELSE 'multiple'
    END as bucket_type
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (
    policyname LIKE '%avatar%' OR 
    policyname LIKE '%post%' OR 
    policyname LIKE '%story%' OR 
    policyname LIKE '%reel%' OR 
    policyname LIKE '%user%media%' OR
    policyname LIKE '%Emergency%'
)
ORDER BY bucket_type, cmd;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 STORAGE SETUP COMPLETE! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test image upload in your app';
    RAISE NOTICE '2. Check if images load properly';
    RAISE NOTICE '3. If issues persist, check Supabase Storage dashboard';
    RAISE NOTICE '4. Verify bucket visibility settings in Supabase UI';
    RAISE NOTICE '';
    RAISE NOTICE 'Buckets created:';
    RAISE NOTICE '- avatars (5MB, public)';
    RAISE NOTICE '- posts (10MB, public)';
    RAISE NOTICE '- stories (5MB, public)';  
    RAISE NOTICE '- reels (50MB, public)';
    RAISE NOTICE '- user-media (10MB, public)';
    RAISE NOTICE '';
END $$;
