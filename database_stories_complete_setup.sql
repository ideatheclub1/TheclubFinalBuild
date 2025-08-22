-- =====================================================
-- COMPLETE STORIES FUNCTIONALITY SETUP
-- =====================================================
-- This file sets up everything needed for the stories feature
-- including table creation, indexes, triggers, RLS policies, and functions

-- =====================================================
-- 1. STORIES TABLE (Enhanced Version)
-- =====================================================

-- Drop and recreate the stories table with all necessary fields
DROP TABLE IF EXISTS "stories" CASCADE;

CREATE TABLE "stories" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  "image_url" TEXT NOT NULL, -- Main image URL for the story
  "media_url" TEXT, -- Alternative field name (for compatibility)
  "media_type" TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  "caption" TEXT, -- Optional caption for the story
  "view_count" INTEGER DEFAULT 0, -- Number of views
  "likes_count" INTEGER DEFAULT 0, -- Number of likes (if implementing story likes)
  "expires_at" TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "is_archived" BOOLEAN DEFAULT FALSE, -- For archiving expired stories
  "metadata" JSONB DEFAULT '{}' -- For additional story metadata
);

-- =====================================================
-- 2. STORY VIEWS TABLE (Track who viewed what story)
-- =====================================================

CREATE TABLE IF NOT EXISTS "story_views" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "story_id" UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  "viewer_id" UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  "viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, viewer_id) -- Prevent duplicate views
);

-- =====================================================
-- 3. STORY LIKES TABLE (Optional - for story reactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS "story_likes" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "story_id" UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, user_id) -- Prevent duplicate likes
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_stories_user_active ON stories(user_id, expires_at) WHERE expires_at > NOW();

-- Story views indexes
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewed_at ON story_views(viewed_at DESC);

-- Story likes indexes
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON story_likes(user_id);

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stories updated_at
DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories
    FOR EACH ROW 
    EXECUTE FUNCTION update_stories_updated_at();

-- Function to increment view count when a view is added
CREATE OR REPLACE FUNCTION increment_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stories 
    SET view_count = view_count + 1 
    WHERE id = NEW.story_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for story view count
DROP TRIGGER IF EXISTS increment_story_view_count ON story_views;
CREATE TRIGGER increment_story_view_count
    AFTER INSERT ON story_views
    FOR EACH ROW
    EXECUTE FUNCTION increment_story_view_count();

-- Function to increment likes count when a like is added
CREATE OR REPLACE FUNCTION increment_story_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stories 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.story_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stories 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.story_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for story likes count
DROP TRIGGER IF EXISTS increment_story_likes_count ON story_likes;
CREATE TRIGGER increment_story_likes_count
    AFTER INSERT ON story_likes
    FOR EACH ROW
    EXECUTE FUNCTION increment_story_likes_count();

DROP TRIGGER IF EXISTS decrement_story_likes_count ON story_likes;
CREATE TRIGGER decrement_story_likes_count
    AFTER DELETE ON story_likes
    FOR EACH ROW
    EXECUTE FUNCTION increment_story_likes_count();

-- Function to clean up expired stories (optional - can be run as a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive expired stories instead of deleting them
    UPDATE stories 
    SET is_archived = TRUE 
    WHERE expires_at < NOW() AND is_archived = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all story-related tables
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;

-- Stories policies
-- Allow users to view all active (non-expired) stories
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
    FOR SELECT USING (expires_at > NOW() AND NOT is_archived);

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

-- Story views policies
-- Allow users to view story views for their own stories
DROP POLICY IF EXISTS "Users can view story views for their stories" ON story_views;
CREATE POLICY "Users can view story views for their stories" ON story_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = story_views.story_id 
            AND stories.user_id = auth.uid()
        )
    );

-- Allow users to insert story views for any story
DROP POLICY IF EXISTS "Users can insert story views" ON story_views;
CREATE POLICY "Users can insert story views" ON story_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Story likes policies
-- Allow users to view all story likes
DROP POLICY IF EXISTS "Users can view story likes" ON story_likes;
CREATE POLICY "Users can view story likes" ON story_likes
    FOR SELECT USING (true);

-- Allow users to insert their own story likes
DROP POLICY IF EXISTS "Users can insert their own story likes" ON story_likes;
CREATE POLICY "Users can insert their own story likes" ON story_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own story likes
DROP POLICY IF EXISTS "Users can delete their own story likes" ON story_likes;
CREATE POLICY "Users can delete their own story likes" ON story_likes
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. USEFUL VIEWS FOR STORY FUNCTIONALITY
-- =====================================================

-- View to get stories with user information
DROP VIEW IF EXISTS stories_with_users;
CREATE VIEW stories_with_users AS
SELECT 
    s.*,
    u.username,
    u.handle,
    u.full_name,
    u.avatar_url as user_avatar,
    u.is_host
FROM stories s
JOIN user_profiles u ON s.user_id = u.id
WHERE s.expires_at > NOW() AND NOT s.is_archived
ORDER BY s.created_at DESC;

-- View to get story analytics for users
DROP VIEW IF EXISTS story_analytics;
CREATE VIEW story_analytics AS
SELECT 
    s.user_id,
    u.username,
    COUNT(s.id) as total_stories,
    SUM(s.view_count) as total_views,
    SUM(s.likes_count) as total_likes,
    AVG(s.view_count) as avg_views_per_story,
    MAX(s.created_at) as last_story_at
FROM stories s
JOIN user_profiles u ON s.user_id = u.id
GROUP BY s.user_id, u.username;

-- =====================================================
-- 8. STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- =====================================================

-- Note: The following should be run in the Supabase dashboard or via the Supabase CLI
-- Create a storage bucket for stories
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'stories',
    'stories',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);
*/

-- Storage policy for stories bucket
/*
CREATE POLICY "Allow authenticated users to upload stories" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'stories' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to stories" ON storage.objects
FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Allow users to update their own story files" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'stories' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to delete their own story files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'stories' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- =====================================================
-- 9. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert some sample stories (only if users exist)
INSERT INTO stories (user_id, image_url, caption, media_type)
SELECT 
    id,
    'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=800',
    'My first story! 🎉',
    'image'
FROM user_profiles 
WHERE is_host = true
LIMIT 3
ON CONFLICT DO NOTHING;

-- Insert some story views for testing
INSERT INTO story_views (story_id, viewer_id)
SELECT 
    s.id,
    u.id
FROM stories s
CROSS JOIN user_profiles u
WHERE s.user_id != u.id
LIMIT 10
ON CONFLICT (story_id, viewer_id) DO NOTHING;

-- =====================================================
-- 10. MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to get user's stories with view counts
CREATE OR REPLACE FUNCTION get_user_stories(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    image_url TEXT,
    caption TEXT,
    view_count INTEGER,
    likes_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    time_remaining INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.image_url,
        s.caption,
        s.view_count,
        s.likes_count,
        s.created_at,
        s.expires_at,
        s.expires_at - NOW() as time_remaining
    FROM stories s
    WHERE s.user_id = target_user_id
    AND s.expires_at > NOW()
    AND NOT s.is_archived
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active stories for feed
CREATE OR REPLACE FUNCTION get_active_stories()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    user_avatar TEXT,
    image_url TEXT,
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
        s.image_url,
        s.caption,
        s.view_count,
        s.likes_count,
        s.created_at,
        s.expires_at
    FROM stories s
    JOIN user_profiles u ON s.user_id = u.id
    WHERE s.expires_at > NOW()
    AND NOT s.is_archived
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- The stories functionality is now fully set up with:
-- ✅ Stories table with all necessary fields
-- ✅ Story views tracking
-- ✅ Story likes system (optional)
-- ✅ Proper indexes for performance
-- ✅ Automatic triggers for counts
-- ✅ Row Level Security policies
-- ✅ Useful views and functions
-- ✅ Sample data for testing
-- ✅ Storage bucket setup instructions

-- Your React Native app should now be able to:
-- ✅ Create stories with images
-- ✅ View stories in a carousel
-- ✅ Track story views automatically
-- ✅ Handle story expiration (24 hours)
-- ✅ Show story analytics
-- ✅ Secure access with RLS

-- To test the functionality:
-- 1. Create a story using the app
-- 2. View stories in the feed
-- 3. Check story views and likes
-- 4. Verify expiration after 24 hours

SELECT 'Stories functionality setup completed successfully!' as status;









