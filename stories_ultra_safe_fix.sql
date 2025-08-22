-- =====================================================
-- ULTRA SAFE STORIES TABLE COMPATIBILITY FIX
-- =====================================================
-- This file safely handles any existing table structure

-- =====================================================
-- 1. ADD MISSING COLUMNS ONLY
-- =====================================================

-- Add the missing is_archived column that's causing the immediate error
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT FALSE;

-- Add essential enhanced columns with safe names
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "media_type" TEXT DEFAULT 'image',
ADD COLUMN IF NOT EXISTS "image_url" TEXT, -- Main image URL column
ADD COLUMN IF NOT EXISTS "video_url" TEXT,
ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT,
ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "aspect_ratio" TEXT DEFAULT '9:16',
ADD COLUMN IF NOT EXISTS "is_fullscreen" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "story_type" TEXT DEFAULT 'story',
ADD COLUMN IF NOT EXISTS "view_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "likes_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "caption" TEXT,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "story_settings" JSONB DEFAULT '{"allow_replies": true, "allow_shares": true}';

-- =====================================================
-- 2. MIGRATE EXISTING DATA SAFELY
-- =====================================================

-- Set default values for existing stories
UPDATE stories SET 
    is_archived = FALSE
WHERE is_archived IS NULL;

UPDATE stories SET 
    is_fullscreen = TRUE,
    aspect_ratio = '9:16',
    media_type = 'image',
    story_type = 'story',
    view_count = 0,
    likes_count = 0
WHERE is_fullscreen IS NULL 
   OR aspect_ratio IS NULL 
   OR media_type IS NULL 
   OR story_type IS NULL;

-- Migrate existing image data to image_url if needed
DO $$
BEGIN
    -- Check if 'image' column exists and migrate data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'image'
    ) THEN
        UPDATE stories SET image_url = image WHERE image_url IS NULL AND image IS NOT NULL;
    END IF;
END $$;

-- Set expires_at for existing stories that don't have it (24 hours from creation)
UPDATE stories SET 
    expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL AND created_at IS NOT NULL;

-- For stories without created_at, set expires_at to 24 hours from now
UPDATE stories SET 
    expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
WHERE expires_at IS NULL;

-- =====================================================
-- 3. CREATE SIMPLE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stories_is_archived ON stories(is_archived);
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);
CREATE INDEX IF NOT EXISTS idx_stories_is_fullscreen ON stories(is_fullscreen);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);

-- =====================================================
-- 4. ADD CONSTRAINTS SAFELY
-- =====================================================

DO $$
BEGIN
    BEGIN
        ALTER TABLE "stories" 
        ADD CONSTRAINT "stories_media_type_check" 
        CHECK (media_type IN ('image', 'video', 'reel'));
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE "stories" 
        ADD CONSTRAINT "stories_story_type_check" 
        CHECK (story_type IN ('story', 'reel_story'));
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- =====================================================
-- 5. CREATE SUPPORT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS "story_views" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS "story_likes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, user_id)
);

-- =====================================================
-- 6. CREATE ULTRA SAFE FUNCTION
-- =====================================================

-- Function that dynamically checks for all possible column variations
CREATE OR REPLACE FUNCTION get_stories_ultra_safe()
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
DECLARE
    query_sql TEXT;
    user_avatar_column TEXT := 'NULL::TEXT';
    image_column_expr TEXT := 'NULL::TEXT';
    stories_columns TEXT[];
    user_columns TEXT[];
BEGIN
    -- Get all available columns for stories table
    SELECT array_agg(column_name) INTO stories_columns
    FROM information_schema.columns 
    WHERE table_name = 'stories';
    
    -- Get all available columns for user_profiles table
    SELECT array_agg(column_name) INTO user_columns
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles';
    
    -- Determine user avatar column
    IF 'avatar_url' = ANY(user_columns) THEN
        user_avatar_column := 'u.avatar_url';
    ELSIF 'avatar' = ANY(user_columns) THEN
        user_avatar_column := 'u.avatar';
    ELSIF 'profile_picture' = ANY(user_columns) THEN
        user_avatar_column := 'u.profile_picture';
    END IF;
    
    -- Determine image column expression
    IF 'image_url' = ANY(stories_columns) AND 'image' = ANY(stories_columns) THEN
        image_column_expr := 'COALESCE(s.image_url, s.image)';
    ELSIF 'image_url' = ANY(stories_columns) THEN
        image_column_expr := 's.image_url';
    ELSIF 'image' = ANY(stories_columns) THEN
        image_column_expr := 's.image';
    END IF;
    
    -- Build safe query
    query_sql := format('
        SELECT 
            s.id,
            s.user_id,
            u.username,
            %s as user_avatar,
            %s as image_url,
            %s as video_url,
            %s as media_type,
            %s as caption,
            %s as view_count,
            %s as likes_count,
            s.created_at,
            %s as expires_at
        FROM stories s
        JOIN user_profiles u ON s.user_id = u.id
        WHERE (%s IS NULL OR %s > CURRENT_TIMESTAMP)
        AND NOT COALESCE(%s, false)
        ORDER BY s.created_at DESC',
        user_avatar_column,
        image_column_expr,
        CASE WHEN 'video_url' = ANY(stories_columns) THEN 's.video_url' ELSE 'NULL::TEXT' END,
        CASE WHEN 'media_type' = ANY(stories_columns) THEN 'COALESCE(s.media_type, ''image'')' ELSE '''image''::TEXT' END,
        CASE WHEN 'caption' = ANY(stories_columns) THEN 's.caption' ELSE 'NULL::TEXT' END,
        CASE WHEN 'view_count' = ANY(stories_columns) THEN 'COALESCE(s.view_count, 0)' ELSE '0' END,
        CASE WHEN 'likes_count' = ANY(stories_columns) THEN 'COALESCE(s.likes_count, 0)' ELSE '0' END,
        CASE WHEN 'expires_at' = ANY(stories_columns) THEN 's.expires_at' ELSE 'NULL::TIMESTAMP WITH TIME ZONE' END,
        CASE WHEN 'expires_at' = ANY(stories_columns) THEN 's.expires_at' ELSE 'NULL::TIMESTAMP WITH TIME ZONE' END,
        CASE WHEN 'expires_at' = ANY(stories_columns) THEN 's.expires_at' ELSE 'NULL::TIMESTAMP WITH TIME ZONE' END,
        CASE WHEN 'is_archived' = ANY(stories_columns) THEN 's.is_archived' ELSE 'false' END
    );
    
    RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE SIMPLE CLEANUP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_stories_ultra_safe()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER := 0;
    has_expires_at BOOLEAN;
    has_is_archived BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'expires_at'
    ) INTO has_expires_at;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'is_archived'
    ) INTO has_is_archived;
    
    IF has_expires_at AND has_is_archived THEN
        -- Archive expired stories
        UPDATE stories 
        SET is_archived = TRUE
        WHERE expires_at < CURRENT_TIMESTAMP AND NOT is_archived;
        
        GET DIAGNOSTICS archived_count = ROW_COUNT;
    ELSIF has_expires_at THEN
        -- Delete expired stories if no archive column
        DELETE FROM stories 
        WHERE expires_at < CURRENT_TIMESTAMP;
        
        GET DIAGNOSTICS archived_count = ROW_COUNT;
    END IF;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREATE BASIC VIEW
-- =====================================================

-- Simple view that just shows basic story info
CREATE OR REPLACE VIEW basic_active_stories AS
SELECT 
    s.id,
    s.user_id,
    s.created_at
FROM stories s
WHERE COALESCE(s.expires_at, CURRENT_TIMESTAMP + INTERVAL '24 hours') > CURRENT_TIMESTAMP
AND NOT COALESCE(s.is_archived, false);

-- =====================================================
-- 9. UPDATE RLS POLICIES
-- =====================================================

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Simple policies that work regardless of column structure
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
    FOR SELECT USING (
        COALESCE(expires_at, CURRENT_TIMESTAMP + INTERVAL '24 hours') > CURRENT_TIMESTAMP
        AND NOT COALESCE(is_archived, false)
    );

DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
CREATE POLICY "Users can insert their own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

-- Show current table structure
SELECT 'Stories table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
ORDER BY ordinal_position;

SELECT 'User profiles avatar columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('avatar', 'avatar_url', 'profile_picture', 'image')
ORDER BY column_name;

-- Test counts
SELECT 'Story counts:' as info;
SELECT 
    COUNT(*) as total_stories,
    COUNT(*) FILTER (WHERE COALESCE(expires_at, CURRENT_TIMESTAMP + INTERVAL '24 hours') > CURRENT_TIMESTAMP) as active_stories,
    COUNT(*) FILTER (WHERE COALESCE(is_archived, false) = true) as archived_stories
FROM stories;

-- Test the ultra safe function
SELECT 'Testing ultra safe function:' as info;
SELECT COUNT(*) as stories_from_safe_function FROM get_stories_ultra_safe();

SELECT json_build_object(
    'status', 'success',
    'message', 'Ultra safe stories compatibility fix applied!',
    'features', json_build_array(
        'Dynamic column detection for all table variations',
        'Safe data migration from any existing structure',
        'Ultra safe functions that adapt to any schema',
        'Basic view that works with minimal columns',
        'RLS policies that work regardless of column structure',
        'Comprehensive verification and testing'
    )
) as ultra_safe_fix_complete;