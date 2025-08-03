-- =====================================================
-- SUPABASE STORAGE SETUP FOR PHOTOS & VIDEOS
-- =====================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('user-media', 'user-media', true),
  ('reels', 'reels', true)
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
-- USER MEDIA TABLE (OPTIONAL - FOR METADATA)
-- =====================================================

-- Create table to store media metadata (optional - for advanced features)
-- Drop the table if it exists to ensure clean creation
DROP TABLE IF EXISTS user_media CASCADE;

-- Create the table with all required columns
CREATE TABLE user_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image' or 'video'
    mime_type TEXT,
    file_size BIGINT,
    bucket_name TEXT NOT NULL,
    public_url TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for videos, in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on user_media table
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_media table
CREATE POLICY "Users can view their own media metadata" ON user_media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media metadata" ON user_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media metadata" ON user_media
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media metadata" ON user_media
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
-- Drop existing indexes if they exist
DROP INDEX IF EXISTS user_media_user_id_idx;
DROP INDEX IF EXISTS user_media_file_type_idx;
DROP INDEX IF EXISTS user_media_created_at_idx;

-- Create new indexes
CREATE INDEX user_media_user_id_idx ON user_media(user_id);
CREATE INDEX user_media_file_type_idx ON user_media(file_type);
CREATE INDEX user_media_created_at_idx ON user_media(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_user_media_updated_at ON user_media;
CREATE TRIGGER update_user_media_updated_at
    BEFORE UPDATE ON user_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if buckets were created
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('user-media', 'reels');

-- Check if policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%user-media%' OR policyname LIKE '%reel%')
ORDER BY policyname;

-- Check if user_media table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_media' 
ORDER BY ordinal_position;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This script sets up:
-- 1. Storage buckets for user media and reels
-- 2. RLS policies for secure file access
-- 3. Optional metadata table for advanced features
-- 4. Proper indexes and triggers

-- Your PhotosVideosScreen should now be able to:
-- - Upload images and videos to the user-media bucket
-- - List user's media files
-- - Delete user's media files
-- - Display media with proper URLs

-- Test the setup by uploading a file through your app! 