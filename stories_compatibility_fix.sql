-- =====================================================
-- STORIES TABLE COMPATIBILITY FIX
-- =====================================================
-- This file fixes compatibility issues with existing stories tables
-- that may not have all the columns from the enhanced setup

-- =====================================================
-- 1. CHECK AND ADD MISSING COLUMNS
-- =====================================================

-- First, let's add the missing is_archived column that's causing the error
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT FALSE;

-- Add all other potentially missing columns from the enhanced setup
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "media_type" TEXT DEFAULT 'image',
ADD COLUMN IF NOT EXISTS "video_url" TEXT,
ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT,
ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "aspect_ratio" TEXT DEFAULT '9:16',
ADD COLUMN IF NOT EXISTS "is_fullscreen" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "story_type" TEXT DEFAULT 'story',
ADD COLUMN IF NOT EXISTS "original_reel_id" UUID,
ADD COLUMN IF NOT EXISTS "music_info" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "effects" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "story_settings" JSONB DEFAULT '{"allow_replies": true, "allow_shares": true}',
ADD COLUMN IF NOT EXISTS "view_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "likes_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "caption" TEXT,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- Add constraints after columns are created
DO $$
BEGIN
    -- Add media_type constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stories_media_type_check' 
        AND table_name = 'stories'
    ) THEN
        ALTER TABLE "stories" 
        ADD CONSTRAINT "stories_media_type_check" 
        CHECK (media_type IN ('image', 'video', 'reel'));
    END IF;

    -- Add story_type constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stories_story_type_check' 
        AND table_name = 'stories'
    ) THEN
        ALTER TABLE "stories" 
        ADD CONSTRAINT "stories_story_type_check" 
        CHECK (story_type IN ('story', 'reel_story'));
    END IF;
END $$;

-- =====================================================
-- 2. UPDATE EXISTING DATA
-- =====================================================

-- Set default values for existing stories
UPDATE stories SET 
    is_archived = FALSE,
    is_fullscreen = TRUE,
    aspect_ratio = '9:16',
    media_type = 'image',
    story_type = 'story',
    view_count = 0,
    likes_count = 0,
    music_info = '{}',
    effects = '{}',
    story_settings = '{"allow_replies": true, "allow_shares": true}',
    metadata = '{}'
WHERE is_archived IS NULL 
   OR is_fullscreen IS NULL 
   OR aspect_ratio IS NULL 
   OR media_type IS NULL 
   OR story_type IS NULL;

-- Set expires_at for existing stories that don't have it
UPDATE stories SET 
    expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL AND created_at IS NOT NULL;

-- For stories without created_at, set expires_at to 24 hours from now
UPDATE stories SET 
    expires_at = NOW() + INTERVAL '24 hours'
WHERE expires_at IS NULL;

-- Set updated_at to created_at if available, otherwise NOW()
UPDATE stories SET 
    updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- =====================================================
-- 3. CREATE MISSING INDEXES
-- =====================================================

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_stories_is_archived ON stories(is_archived);
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);
CREATE INDEX IF NOT EXISTS idx_stories_story_type ON stories(story_type);
CREATE INDEX IF NOT EXISTS idx_stories_is_fullscreen ON stories(is_fullscreen);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(expires_at) WHERE expires_at > NOW() AND NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_stories_user_active ON stories(user_id, expires_at) WHERE expires_at > NOW() AND NOT is_archived;

-- =====================================================
-- 4. CREATE MISSING TABLES
-- =====================================================

-- Create story_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS "story_views" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    "viewer_id" UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    "viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

-- Create story_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "story_likes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

-- Create story_deletion_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS "story_deletion_log" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "reason" TEXT DEFAULT 'expired_24h',
    "metadata" JSONB DEFAULT '{}',
    "file_urls" JSONB DEFAULT '[]',
    "cleanup_batch_id" UUID,
    "deletion_method" TEXT DEFAULT 'auto'
);

-- =====================================================
-- 5. CREATE MISSING FUNCTIONS (SAFE VERSIONS)
-- =====================================================

-- Safe function to get active stories (works with or without is_archived)
CREATE OR REPLACE FUNCTION get_active_stories_safe()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    user_avatar TEXT,
    image_url TEXT,
    video_url TEXT,
    media_type TEXT,
    caption TEXT,
    view_count INTEGER,
    likes_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        u.username,
        u.avatar_url,
        COALESCE(s.image_url, s.image) as image_url,
        s.video_url,
        COALESCE(s.media_type, 'image') as media_type,
        s.caption,
        COALESCE(s.view_count, 0) as view_count,
        COALESCE(s.likes_count, 0) as likes_count,
        s.created_at,
        s.expires_at
    FROM stories s
    JOIN user_profiles u ON s.user_id = u.id
    WHERE (s.expires_at IS NULL OR s.expires_at > NOW())
    AND (
        -- Check if is_archived column exists, if not, don't filter by it
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'stories' AND column_name = 'is_archived'
            ) THEN NOT COALESCE(s.is_archived, false)
            ELSE true
        END
    )
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Safe cleanup function that works with existing table structure
CREATE OR REPLACE FUNCTION cleanup_expired_stories_safe()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER := 0;
    has_archived_column BOOLEAN;
BEGIN
    -- Check if is_archived column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'is_archived'
    ) INTO has_archived_column;
    
    IF has_archived_column THEN
        -- Archive expired stories
        UPDATE stories 
        SET is_archived = TRUE,
            updated_at = NOW()
        WHERE expires_at < NOW() AND NOT is_archived;
        
        GET DIAGNOSTICS archived_count = ROW_COUNT;
    ELSE
        -- If no is_archived column, just delete expired stories
        DELETE FROM stories 
        WHERE expires_at < NOW();
        
        GET DIAGNOSTICS archived_count = ROW_COUNT;
    END IF;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. UPDATE EXISTING FUNCTIONS TO BE SAFE
-- =====================================================

-- Update any existing functions that reference is_archived to be safe
DROP FUNCTION IF EXISTS get_fullscreen_stories();
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
        COALESCE(s.media_type, 'image') as media_type,
        COALESCE(s.image_url, s.image) as image_url,
        s.video_url,
        s.thumbnail_url,
        COALESCE(s.duration, 0) as duration,
        COALESCE(s.aspect_ratio, '9:16') as aspect_ratio,
        s.caption,
        COALESCE(s.view_count, 0) as view_count,
        COALESCE(s.likes_count, 0) as likes_count,
        s.created_at,
        s.expires_at,
        s.expires_at - NOW() as time_remaining,
        COALESCE(s.story_settings, '{"allow_replies": true, "allow_shares": true}'::jsonb) as story_settings
    FROM stories s
    JOIN user_profiles u ON s.user_id = u.id
    WHERE (s.expires_at IS NULL OR s.expires_at > NOW())
    AND (
        -- Safely check for is_archived column
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'stories' AND column_name = 'is_archived'
            ) THEN NOT COALESCE(s.is_archived, false)
            ELSE true
        END
    )
    AND COALESCE(s.is_fullscreen, true) = true
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE SAFE RLS POLICIES
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies with safe column references
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
    FOR SELECT USING (
        (expires_at IS NULL OR expires_at > NOW())
        AND (
            -- Safely check for is_archived column
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'stories' AND column_name = 'is_archived'
                ) THEN NOT COALESCE(is_archived, false)
                ELSE true
            END
        )
    );

-- =====================================================
-- COMPLETION AND VERIFICATION
-- =====================================================

-- Test that the fixes work
SELECT 'Testing compatibility fixes...' as status;

-- Test the safe functions
SELECT COUNT(*) as active_stories_count FROM get_active_stories_safe();
SELECT COUNT(*) as fullscreen_stories_count FROM get_fullscreen_stories();

-- Verify columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
ORDER BY ordinal_position;

SELECT json_build_object(
    'status', 'success',
    'message', 'Stories table compatibility fixes applied successfully!',
    'fixes_applied', json_build_array(
        'Added missing is_archived column',
        'Added all enhanced story columns',
        'Updated existing data with defaults',
        'Created safe functions that work with any table structure',
        'Created missing indexes and tables',
        'Updated RLS policies to be column-safe'
    ),
    'safe_functions', json_build_array(
        'get_active_stories_safe()',
        'get_fullscreen_stories()',
        'cleanup_expired_stories_safe()'
    )
) as compatibility_fix_complete;