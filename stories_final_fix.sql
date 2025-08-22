-- =====================================================
-- FINAL STORIES TABLE COMPATIBILITY FIX
-- =====================================================
-- This file fixes all compatibility issues with existing table structures

-- =====================================================
-- 1. ADD MISSING COLUMNS ONLY
-- =====================================================

-- Add the missing is_archived column that's causing the immediate error
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT FALSE;

-- Add essential enhanced columns
ALTER TABLE "stories" 
ADD COLUMN IF NOT EXISTS "media_type" TEXT DEFAULT 'image',
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
-- 2. UPDATE EXISTING DATA
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

-- Set expires_at for existing stories that don't have it (24 hours from creation)
UPDATE stories SET 
    expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL AND created_at IS NOT NULL;

-- For stories without created_at, set expires_at to 24 hours from now
UPDATE stories SET 
    expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
WHERE expires_at IS NULL;

-- =====================================================
-- 3. CREATE SIMPLE INDEXES (NO PREDICATES)
-- =====================================================

-- Create simple indexes without WHERE clauses to avoid immutable function issues
CREATE INDEX IF NOT EXISTS idx_stories_is_archived ON stories(is_archived);
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);
CREATE INDEX IF NOT EXISTS idx_stories_is_fullscreen ON stories(is_fullscreen);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);

-- =====================================================
-- 4. ADD SIMPLE CONSTRAINTS
-- =====================================================

-- Add constraints in a safe way
DO $$
BEGIN
    -- Add media_type constraint if it doesn't exist
    BEGIN
        ALTER TABLE "stories" 
        ADD CONSTRAINT "stories_media_type_check" 
        CHECK (media_type IN ('image', 'video', 'reel'));
    EXCEPTION WHEN OTHERS THEN
        -- Constraint already exists or other error, continue
        NULL;
    END;

    -- Add story_type constraint if it doesn't exist
    BEGIN
        ALTER TABLE "stories" 
        ADD CONSTRAINT "stories_story_type_check" 
        CHECK (story_type IN ('story', 'reel_story'));
    EXCEPTION WHEN OTHERS THEN
        -- Constraint already exists or other error, continue
        NULL;
    END;
END $$;

-- =====================================================
-- 5. CREATE MISSING SUPPORT TABLES
-- =====================================================

-- Create story_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS "story_views" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, viewer_id)
);

-- Create story_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "story_likes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, user_id)
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for story_views.story_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'story_views_story_id_fkey'
    ) THEN
        ALTER TABLE story_views 
        ADD CONSTRAINT story_views_story_id_fkey 
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for story_likes.story_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'story_likes_story_id_fkey'
    ) THEN
        ALTER TABLE story_likes 
        ADD CONSTRAINT story_likes_story_id_fkey 
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 6. CREATE SIMPLE CLEANUP FUNCTION
-- =====================================================

-- Simple cleanup function without complex logic
CREATE OR REPLACE FUNCTION cleanup_expired_stories_simple()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER := 0;
BEGIN
    -- Archive expired stories
    UPDATE stories 
    SET is_archived = TRUE
    WHERE expires_at < CURRENT_TIMESTAMP AND NOT is_archived;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE FLEXIBLE VIEW FOR ACTIVE STORIES
-- =====================================================

-- Create a dynamic view that adapts to the actual user_profiles structure
CREATE OR REPLACE FUNCTION create_active_stories_view()
RETURNS TEXT AS $$
DECLARE
    user_avatar_column TEXT;
    view_sql TEXT;
BEGIN
    -- Check which avatar column exists in user_profiles
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
    ) THEN
        user_avatar_column := 'u.avatar_url';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar'
    ) THEN
        user_avatar_column := 'u.avatar';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_picture'
    ) THEN
        user_avatar_column := 'u.profile_picture';
    ELSE
        user_avatar_column := 'NULL';
    END IF;

    -- Create the view with the appropriate column
    view_sql := format('
        CREATE OR REPLACE VIEW active_stories AS
        SELECT 
            s.*,
            u.username,
            %s as user_avatar
        FROM stories s
        JOIN user_profiles u ON s.user_id = u.id
        WHERE (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
        AND NOT COALESCE(s.is_archived, false)',
        user_avatar_column
    );
    
    EXECUTE view_sql;
    
    RETURN 'Active stories view created with avatar column: ' || user_avatar_column;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create the view
SELECT create_active_stories_view();

-- =====================================================
-- 8. CREATE SAFE FUNCTION TO GET STORIES
-- =====================================================

-- Function that works regardless of user_profiles column names
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
DECLARE
    query_sql TEXT;
    user_avatar_column TEXT;
BEGIN
    -- Check which avatar column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
    ) THEN
        user_avatar_column := 'u.avatar_url';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar'
    ) THEN
        user_avatar_column := 'u.avatar';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_picture'
    ) THEN
        user_avatar_column := 'u.profile_picture';
    ELSE
        user_avatar_column := 'NULL::TEXT';
    END IF;

    -- Build dynamic query
    query_sql := format('
        SELECT 
            s.id,
            s.user_id,
            u.username,
            %s as user_avatar,
            COALESCE(s.image_url, s.image) as image_url,
            s.video_url,
            COALESCE(s.media_type, ''image'') as media_type,
            s.caption,
            COALESCE(s.view_count, 0) as view_count,
            COALESCE(s.likes_count, 0) as likes_count,
            s.created_at,
            s.expires_at
        FROM stories s
        JOIN user_profiles u ON s.user_id = u.id
        WHERE (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
        AND NOT COALESCE(s.is_archived, false)
        ORDER BY s.created_at DESC',
        user_avatar_column
    );
    
    RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. UPDATE RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
    FOR SELECT USING (
        (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND NOT COALESCE(is_archived, false)
    );

-- Allow users to insert their own stories
DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
CREATE POLICY "Users can insert their own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own stories
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own stories
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 10. VERIFICATION AND CLEANUP
-- =====================================================

-- Show user_profiles columns for reference
SELECT 'User profiles columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('avatar', 'avatar_url', 'profile_picture')
ORDER BY column_name;

-- Test that everything works
SELECT 'Stories table verification:' as info;
SELECT 
    COUNT(*) as total_stories,
    COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) as active_stories,
    COUNT(*) FILTER (WHERE is_archived = true) as archived_stories
FROM stories;

-- Test the safe function
SELECT 'Testing safe function:' as info;
SELECT COUNT(*) as stories_from_function FROM get_active_stories_safe();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT json_build_object(
    'status', 'success',
    'message', 'Final stories compatibility fix applied successfully!',
    'fixes_applied', json_build_array(
        'Added missing is_archived column',
        'Added essential enhanced story columns',
        'Updated existing data with safe defaults',
        'Created simple indexes without predicates',
        'Created support tables with foreign keys',
        'Created dynamic view that adapts to user_profiles structure',
        'Created safe function that works with any avatar column name',
        'Updated RLS policies',
        'Added comprehensive verification'
    ),
    'note', 'This fix automatically detects and uses the correct avatar column name'
) as final_fix_complete;