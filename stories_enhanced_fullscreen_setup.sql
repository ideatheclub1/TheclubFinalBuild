-- =====================================================
-- ENHANCED FULL-SCREEN STORIES WITH VIDEO/REEL SUPPORT
-- =====================================================
-- This file enhances the existing stories functionality with:
-- ✅ Full-screen story support (9:16 aspect ratio)
-- ✅ Video/Reel support in stories
-- ✅ Auto-deletion after 24 hours
-- ✅ Enhanced media handling

-- =====================================================
-- 1. ENHANCED STORIES TABLE UPDATES
-- =====================================================

-- Add new columns for enhanced story features
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "media_type" TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'reel')),
ADD COLUMN IF NOT EXISTS "video_url" TEXT, -- For video stories
ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT, -- Thumbnail for video stories
ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 0, -- Video duration in seconds
ADD COLUMN IF NOT EXISTS "aspect_ratio" TEXT DEFAULT '9:16', -- Story aspect ratio
ADD COLUMN IF NOT EXISTS "is_fullscreen" BOOLEAN DEFAULT true, -- Full-screen display flag
ADD COLUMN IF NOT EXISTS "story_type" TEXT DEFAULT 'story' CHECK (story_type IN ('story', 'reel_story')),
ADD COLUMN IF NOT EXISTS "original_reel_id" UUID REFERENCES posts(id) ON DELETE SET NULL, -- If story is from a reel
ADD COLUMN IF NOT EXISTS "music_info" JSONB DEFAULT '{}', -- Music information for video stories
ADD COLUMN IF NOT EXISTS "effects" JSONB DEFAULT '{}', -- Story effects/filters used
ADD COLUMN IF NOT EXISTS "story_settings" JSONB DEFAULT '{"allow_replies": true, "allow_shares": true}';

-- Update existing stories to be full-screen by default
UPDATE stories SET 
  is_fullscreen = true,
  aspect_ratio = '9:16'
WHERE is_fullscreen IS NULL OR aspect_ratio IS NULL;

-- =====================================================
-- 2. AUTO-DELETION SYSTEM (24 HOUR EXPIRY)
-- =====================================================

-- Function to permanently delete expired stories and their media
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    story_record RECORD;
BEGIN
    -- Get all expired stories
    FOR story_record IN 
        SELECT id, image_url, video_url, thumbnail_url 
        FROM stories 
        WHERE expires_at < NOW() AND NOT is_archived
    LOOP
        -- Delete associated storage files (optional - comment out if you want to keep files)
        -- Note: This would need to be implemented with a storage cleanup service
        
        -- Delete the story record
        DELETE FROM stories WHERE id = story_record.id;
        deleted_count := deleted_count + 1;
        
        -- Log the deletion (optional)
        INSERT INTO story_deletion_log (story_id, deleted_at, reason)
        VALUES (story_record.id, NOW(), 'expired_24h')
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive expired stories instead of deleting (safer option)
CREATE OR REPLACE FUNCTION archive_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE stories 
    SET is_archived = TRUE,
        updated_at = NOW()
    WHERE expires_at < NOW() AND NOT is_archived;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create a deletion log table to track removed stories
CREATE TABLE IF NOT EXISTS "story_deletion_log" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "reason" TEXT DEFAULT 'expired_24h',
    "metadata" JSONB DEFAULT '{}'
);

-- =====================================================
-- 3. AUTOMATIC CLEANUP SCHEDULING
-- =====================================================

-- Create a function that runs the cleanup and can be called by a cron job
CREATE OR REPLACE FUNCTION automated_story_cleanup()
RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    archived_count INTEGER;
    result JSONB;
BEGIN
    -- First archive expired stories
    SELECT archive_expired_stories() INTO archived_count;
    
    -- Then delete stories that have been archived for more than 7 days (optional)
    DELETE FROM stories 
    WHERE is_archived = true 
    AND updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return cleanup summary
    result := json_build_object(
        'timestamp', NOW(),
        'archived_count', archived_count,
        'deleted_count', deleted_count,
        'status', 'success'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. ENHANCED INDEXES FOR VIDEO STORIES
-- =====================================================

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);
CREATE INDEX IF NOT EXISTS idx_stories_story_type ON stories(story_type);
CREATE INDEX IF NOT EXISTS idx_stories_is_fullscreen ON stories(is_fullscreen);
CREATE INDEX IF NOT EXISTS idx_stories_duration ON stories(duration) WHERE media_type IN ('video', 'reel');
CREATE INDEX IF NOT EXISTS idx_stories_original_reel ON stories(original_reel_id) WHERE original_reel_id IS NOT NULL;

-- Composite index for active full-screen stories
CREATE INDEX IF NOT EXISTS idx_stories_active_fullscreen ON stories(user_id, expires_at, is_fullscreen) 
WHERE expires_at > NOW() AND NOT is_archived AND is_fullscreen = true;

-- =====================================================
-- 5. ENHANCED STORAGE BUCKET CONFIGURATION
-- =====================================================

-- Update storage bucket to support videos (Run in Supabase Dashboard)
/*
-- Update the stories bucket to support larger video files
UPDATE storage.buckets 
SET 
    file_size_limit = 104857600, -- 100MB for videos
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'video/mp4', 
        'video/quicktime',
        'video/avi',
        'video/mov'
    ]
WHERE id = 'stories';

-- Create video-specific folder structure
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES 
    ('stories', 'videos/', auth.uid(), '{"type": "folder"}'),
    ('stories', 'thumbnails/', auth.uid(), '{"type": "folder"}'),
    ('stories', 'images/', auth.uid(), '{"type": "folder"}')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- 6. ENHANCED FUNCTIONS FOR FULL-SCREEN STORIES
-- =====================================================

-- Function to get active full-screen stories with media info
CREATE OR REPLACE FUNCTION get_fullscreen_stories()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    user_avatar TEXT,
    media_type TEXT,
    image_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER,
    aspect_ratio TEXT,
    caption TEXT,
    view_count INTEGER,
    likes_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    time_remaining INTERVAL,
    story_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        u.username,
        u.avatar_url,
        s.media_type,
        s.image_url,
        s.video_url,
        s.thumbnail_url,
        s.duration,
        s.aspect_ratio,
        s.caption,
        s.view_count,
        s.likes_count,
        s.created_at,
        s.expires_at,
        s.expires_at - NOW() as time_remaining,
        s.story_settings
    FROM stories s
    JOIN user_profiles u ON s.user_id = u.id
    WHERE s.expires_at > NOW()
    AND NOT s.is_archived
    AND s.is_fullscreen = true
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a story from a reel
CREATE OR REPLACE FUNCTION create_story_from_reel(
    p_user_id UUID,
    p_reel_id UUID,
    p_caption TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    reel_record RECORD;
    new_story_id UUID;
BEGIN
    -- Get the reel information
    SELECT video_url, thumbnail_url, duration, description
    INTO reel_record
    FROM posts
    WHERE id = p_reel_id AND post_type = 'reel';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reel not found with id: %', p_reel_id;
    END IF;
    
    -- Create the story
    INSERT INTO stories (
        user_id,
        media_type,
        video_url,
        thumbnail_url,
        duration,
        caption,
        story_type,
        original_reel_id,
        is_fullscreen,
        aspect_ratio
    ) VALUES (
        p_user_id,
        'reel',
        reel_record.video_url,
        reel_record.thumbnail_url,
        reel_record.duration,
        COALESCE(p_caption, reel_record.description),
        'reel_story',
        p_reel_id,
        true,
        '9:16'
    )
    RETURNING id INTO new_story_id;
    
    RETURN new_story_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's story statistics
CREATE OR REPLACE FUNCTION get_user_story_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT json_build_object(
        'total_stories', COUNT(*),
        'total_views', SUM(view_count),
        'total_likes', SUM(likes_count),
        'avg_views_per_story', ROUND(AVG(view_count), 2),
        'active_stories', COUNT(*) FILTER (WHERE expires_at > NOW()),
        'video_stories', COUNT(*) FILTER (WHERE media_type IN ('video', 'reel')),
        'image_stories', COUNT(*) FILTER (WHERE media_type = 'image'),
        'last_story_at', MAX(created_at)
    )
    INTO stats
    FROM stories
    WHERE user_id = p_user_id AND NOT is_archived;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. UPDATED RLS POLICIES FOR ENHANCED FEATURES
-- =====================================================

-- Update the view policy to include video stories
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
    FOR SELECT USING (
        expires_at > NOW() 
        AND NOT is_archived 
        AND (
            -- Public stories
            (story_settings->>'visibility' = 'public' OR story_settings->>'visibility' IS NULL)
            OR 
            -- Stories visible to authenticated users
            (auth.uid() IS NOT NULL)
        )
    );

-- =====================================================
-- 8. TRIGGER FOR AUTOMATIC THUMBNAIL GENERATION
-- =====================================================

-- Function to trigger thumbnail generation for video stories
CREATE OR REPLACE FUNCTION generate_video_thumbnail()
RETURNS TRIGGER AS $$
BEGIN
    -- If it's a video story without a thumbnail, mark it for thumbnail generation
    IF NEW.media_type IN ('video', 'reel') AND NEW.thumbnail_url IS NULL AND NEW.video_url IS NOT NULL THEN
        -- You would implement actual thumbnail generation in your app
        -- This just logs that a thumbnail is needed
        NEW.metadata = jsonb_set(
            COALESCE(NEW.metadata, '{}'),
            '{needs_thumbnail}',
            'true'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for thumbnail generation
DROP TRIGGER IF EXISTS generate_video_thumbnail ON stories;
CREATE TRIGGER generate_video_thumbnail
    BEFORE INSERT OR UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION generate_video_thumbnail();

-- =====================================================
-- 9. VIEWS FOR ENHANCED STORY FUNCTIONALITY
-- =====================================================

-- View for active full-screen stories with all details
DROP VIEW IF EXISTS active_fullscreen_stories;
CREATE VIEW active_fullscreen_stories AS
SELECT 
    s.*,
    u.username,
    u.handle,
    u.full_name,
    u.avatar_url as user_avatar,
    u.is_host,
    s.expires_at - NOW() as time_remaining,
    CASE 
        WHEN s.media_type = 'video' OR s.media_type = 'reel' THEN s.video_url
        ELSE s.image_url
    END as display_url,
    CASE 
        WHEN s.media_type = 'video' OR s.media_type = 'reel' THEN s.thumbnail_url
        ELSE s.image_url
    END as preview_url
FROM stories s
JOIN user_profiles u ON s.user_id = u.id
WHERE s.expires_at > NOW() 
AND NOT s.is_archived 
AND s.is_fullscreen = true
ORDER BY s.created_at DESC;

-- =====================================================
-- 10. MIGRATION DATA FOR EXISTING STORIES
-- =====================================================

-- Update existing stories to be full-screen compatible
UPDATE stories 
SET 
    is_fullscreen = true,
    aspect_ratio = '9:16',
    story_settings = jsonb_build_object(
        'allow_replies', true,
        'allow_shares', true,
        'visibility', 'public'
    ),
    media_type = CASE 
        WHEN media_url LIKE '%.mp4' OR media_url LIKE '%.mov' THEN 'video'
        ELSE 'image'
    END
WHERE is_fullscreen IS NULL;

-- Set video_url for existing video stories
UPDATE stories 
SET video_url = COALESCE(media_url, image_url)
WHERE media_type = 'video' AND video_url IS NULL;

-- =====================================================
-- 11. CLEANUP AND MAINTENANCE PROCEDURES
-- =====================================================

-- Procedure to run daily cleanup (can be scheduled)
CREATE OR REPLACE FUNCTION daily_story_maintenance()
RETURNS JSONB AS $$
DECLARE
    maintenance_result JSONB;
    cleanup_result JSONB;
BEGIN
    -- Run the automated cleanup
    SELECT automated_story_cleanup() INTO cleanup_result;
    
    -- Update view counts and other statistics
    REFRESH MATERIALIZED VIEW IF EXISTS story_analytics;
    
    -- Optimize storage by removing orphaned files (would need external implementation)
    
    maintenance_result := json_build_object(
        'timestamp', NOW(),
        'cleanup_result', cleanup_result,
        'status', 'completed'
    );
    
    RETURN maintenance_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. SAMPLE DATA FOR TESTING ENHANCED FEATURES
-- =====================================================

-- Insert sample full-screen video stories
INSERT INTO stories (
    user_id, 
    media_type, 
    image_url, 
    video_url, 
    thumbnail_url,
    duration,
    caption, 
    is_fullscreen,
    aspect_ratio,
    story_settings
)
SELECT 
    id,
    'video',
    'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=800',
    15,
    'Check out my video story! 🎬✨',
    true,
    '9:16',
    '{"allow_replies": true, "allow_shares": true, "visibility": "public"}'::jsonb
FROM user_profiles 
WHERE is_host = true
LIMIT 2
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT json_build_object(
    'status', 'success',
    'message', 'Enhanced full-screen stories with video support and auto-deletion setup completed!',
    'features', json_build_array(
        'Full-screen 9:16 aspect ratio stories',
        'Video and reel support in stories', 
        'Auto-deletion after 24 hours',
        'Story creation from existing reels',
        'Enhanced media handling',
        'Comprehensive analytics',
        'Automated cleanup procedures'
    ),
    'next_steps', json_build_array(
        'Update your React Native app to use the new story format',
        'Implement video thumbnail generation',
        'Set up a cron job to run daily_story_maintenance()',
        'Test video story upload and playback',
        'Update storage bucket settings in Supabase dashboard'
    )
) as setup_complete;