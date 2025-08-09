-- =====================================================
-- EMERGENCY STORAGE FIX - IMMEDIATE SOLUTION
-- =====================================================
-- This script provides the most aggressive fix for storage issues
-- Run this if the main storage fix didn't work

-- =====================================================
-- EMERGENCY: CREATE BUCKETS WITH MAXIMUM PERMISSIONS
-- =====================================================

-- First, create the buckets (ignore conflicts)
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES 
('posts', 'posts', true, 52428800),     -- 50MB
('avatars', 'avatars', true, 10485760), -- 10MB  
('stories', 'stories', true, 10485760), -- 10MB
('reels', 'reels', true, 104857600),    -- 100MB
('user-media', 'user-media', true, 52428800) -- 50MB
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit;

-- =====================================================
-- EMERGENCY: REMOVE ALL RESTRICTIVE POLICIES
-- =====================================================

-- Remove ALL storage policies to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- =====================================================
-- EMERGENCY: CREATE SUPER PERMISSIVE POLICIES
-- =====================================================

-- Allow EVERYTHING for authenticated users
CREATE POLICY "Allow all authenticated users full access" ON storage.objects
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public read access to all files
CREATE POLICY "Allow public read access to all files" ON storage.objects
FOR SELECT 
TO public
USING (true);

-- Allow anonymous read access 
CREATE POLICY "Allow anonymous read access" ON storage.objects
FOR SELECT 
TO anon
USING (true);

-- =====================================================
-- EMERGENCY: VERIFY EVERYTHING IS WORKING
-- =====================================================

-- Check bucket creation
SELECT 'BUCKETS CREATED:' as status;
SELECT id, name, public, file_size_limit/1024/1024 as size_mb 
FROM storage.buckets 
WHERE id IN ('posts', 'avatars', 'stories', 'reels', 'user-media');

-- Check policies
SELECT 'POLICIES CREATED:' as status;
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- =====================================================
-- EMERGENCY: TEST THE SPECIFIC FAILING IMAGE
-- =====================================================

-- Check if the failing post exists
SELECT 'CHECKING FAILING POST:' as status;
SELECT id, user_id, image_url, created_at 
FROM posts 
WHERE id = '25322aa4-aec6-4e79-a179-20ec83900932';

-- Check if any files exist in posts bucket
SELECT 'FILES IN POSTS BUCKET:' as status;
SELECT name, bucket_id, created_at 
FROM storage.objects 
WHERE bucket_id = 'posts' 
LIMIT 5;

-- =====================================================
-- EMERGENCY: MANUAL URL TESTING
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚨 EMERGENCY STORAGE FIX COMPLETE';
    RAISE NOTICE '';
    RAISE NOTICE 'IMMEDIATE ACTIONS:';
    RAISE NOTICE '1. Test this URL in your browser:';
    RAISE NOTICE 'https://jbcxrqyzyuhhmolsxtrx.supabase.co/storage/v1/object/public/posts/972be8f0-272f-405d-a278-5b68fa0302a4/images/1754171024528.jpg';
    RAISE NOTICE '';
    RAISE NOTICE '2. If URL still fails, the file might not exist';
    RAISE NOTICE '3. Try uploading a new image through your app';
    RAISE NOTICE '4. Check Storage section in Supabase Dashboard';
    RAISE NOTICE '';
    RAISE NOTICE 'This fix removes ALL restrictions - use temporarily only!';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- EMERGENCY: CREATE TEST FILE FUNCTION
-- =====================================================

-- Function to test if storage is working
CREATE OR REPLACE FUNCTION test_storage_access()
RETURNS TABLE (
    test_name TEXT,
    result TEXT,
    details TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Test 1: Check if buckets exist
    RETURN QUERY 
    SELECT 
        'Buckets Exist'::TEXT,
        CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*)::TEXT || '/5 required buckets'::TEXT
    FROM storage.buckets 
    WHERE id IN ('posts', 'avatars', 'stories', 'reels', 'user-media');

    -- Test 2: Check if buckets are public
    RETURN QUERY
    SELECT 
        'Buckets Public'::TEXT,
        CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*)::TEXT || '/5 public buckets'::TEXT
    FROM storage.buckets 
    WHERE id IN ('posts', 'avatars', 'stories', 'reels', 'user-media')
    AND public = true;

    -- Test 3: Check policies
    RETURN QUERY
    SELECT 
        'Policies Exist'::TEXT,
        CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' storage policies'::TEXT
    FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage';

    -- Test 4: Check failing post
    RETURN QUERY
    SELECT 
        'Failing Post Exists'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Post found in database' ELSE 'Post not found in database' END::TEXT
    FROM posts 
    WHERE id = '25322aa4-aec6-4e79-a179-20ec83900932';
END $$;

-- Run the test
SELECT * FROM test_storage_access();

-- =====================================================
-- FINAL EMERGENCY MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚡ EMERGENCY FIX APPLIED ⚡';
    RAISE NOTICE '';
    RAISE NOTICE 'WHAT THIS SCRIPT DID:';
    RAISE NOTICE '✅ Created all storage buckets as PUBLIC';
    RAISE NOTICE '✅ Removed all restrictive policies';  
    RAISE NOTICE '✅ Added super-permissive policies';
    RAISE NOTICE '✅ Enabled access for everyone';
    RAISE NOTICE '';
    RAISE NOTICE 'TEST IMMEDIATELY:';
    RAISE NOTICE '1. Refresh your app';
    RAISE NOTICE '2. Check if images load';
    RAISE NOTICE '3. Try uploading new images';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  SECURITY NOTE: This is very permissive!';
    RAISE NOTICE 'Consider applying proper RLS policies later';
    RAISE NOTICE '';
END $$;
