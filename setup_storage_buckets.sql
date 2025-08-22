-- =====================================================
-- SETUP STORAGE BUCKETS FOR REELS AND THUMBNAILS
-- =====================================================
-- This script creates the required storage buckets for the reel thumbnail feature

-- Create reels bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'reels',
  'reels', 
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create thumbnails bucket if it doesn't exist  
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create user-media bucket if it doesn't exist (for posts)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'user-media',
  'user-media',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE POLICIES FOR REELS BUCKET
-- =====================================================

-- Policy to allow authenticated users to upload reels
CREATE POLICY "Users can upload reels" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'reels' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow public access to view reels
CREATE POLICY "Public can view reels" ON storage.objects
FOR SELECT USING (bucket_id = 'reels');

-- Policy to allow users to update their own reels
CREATE POLICY "Users can update own reels" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'reels' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own reels
CREATE POLICY "Users can delete own reels" ON storage.objects
FOR DELETE USING (
  bucket_id = 'reels' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- STORAGE POLICIES FOR THUMBNAILS BUCKET
-- =====================================================

-- Policy to allow authenticated users to upload thumbnails
CREATE POLICY "Users can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow public access to view thumbnails
CREATE POLICY "Public can view thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

-- Policy to allow users to update their own thumbnails
CREATE POLICY "Users can update own thumbnails" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails" ON storage.objects
FOR DELETE USING (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- STORAGE POLICIES FOR USER-MEDIA BUCKET  
-- =====================================================

-- Policy to allow authenticated users to upload media
CREATE POLICY "Users can upload media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow public access to view media
CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT USING (bucket_id = 'user-media');

-- Policy to allow users to update their own media
CREATE POLICY "Users can update own media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own media
CREATE POLICY "Users can delete own media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- ENABLE RLS ON STORAGE OBJECTS
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if buckets were created successfully
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at 
FROM storage.buckets 
WHERE id IN ('reels', 'thumbnails', 'user-media')
ORDER BY id;

-- Check storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%reel%' OR policyname LIKE '%thumbnail%' OR policyname LIKE '%media%'
ORDER BY policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Storage buckets setup completed successfully!';
  RAISE NOTICE 'Created buckets: reels, thumbnails, user-media';
  RAISE NOTICE 'All necessary RLS policies have been applied';
  RAISE NOTICE 'You can now upload videos, thumbnails, and other media files';
END $$;