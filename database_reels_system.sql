-- =====================================================
-- REELS SYSTEM DATABASE SETUP
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS reel_likes CASCADE;
DROP TABLE IF EXISTS reel_saves CASCADE;
DROP TABLE IF EXISTS reel_shares CASCADE;
DROP TABLE IF EXISTS reel_music CASCADE;
DROP TABLE IF EXISTS reels CASCADE;

-- =====================================================
-- MAIN REELS TABLE
-- =====================================================

CREATE TABLE reels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- Duration in seconds
    view_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    hashtags TEXT[], -- Array of hashtags
    location TEXT,
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'reported', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REEL MUSIC TABLE
-- =====================================================

CREATE TABLE reel_music (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    cover_url TEXT,
    duration INTEGER, -- Duration in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REEL LIKES TABLE
-- =====================================================

CREATE TABLE reel_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

-- =====================================================
-- REEL SAVES TABLE
-- =====================================================

CREATE TABLE reel_saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

-- =====================================================
-- REEL SHARES TABLE
-- =====================================================

CREATE TABLE reel_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    share_type TEXT DEFAULT 'internal' CHECK (share_type IN ('internal', 'external', 'story')),
    platform TEXT, -- 'instagram', 'twitter', 'facebook', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Reels table indexes
CREATE INDEX idx_reels_user_id ON reels(user_id);
CREATE INDEX idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX idx_reels_status ON reels(status);
CREATE INDEX idx_reels_is_public ON reels(is_public);
CREATE INDEX idx_reels_is_featured ON reels(is_featured);
CREATE INDEX idx_reels_likes_count ON reels(likes_count DESC);
CREATE INDEX idx_reels_view_count ON reels(view_count DESC);

-- Reel likes indexes
CREATE INDEX idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user_id ON reel_likes(user_id);
CREATE INDEX idx_reel_likes_created_at ON reel_likes(created_at);

-- Reel saves indexes
CREATE INDEX idx_reel_saves_reel_id ON reel_saves(reel_id);
CREATE INDEX idx_reel_saves_user_id ON reel_saves(user_id);
CREATE INDEX idx_reel_saves_created_at ON reel_saves(created_at);

-- Reel shares indexes
CREATE INDEX idx_reel_shares_reel_id ON reel_shares(reel_id);
CREATE INDEX idx_reel_shares_user_id ON reel_shares(user_id);
CREATE INDEX idx_reel_shares_created_at ON reel_shares(created_at);

-- Reel music indexes
CREATE INDEX idx_reel_music_reel_id ON reel_music(reel_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC COUNT UPDATES
-- =====================================================

-- Function to update reel likes count
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET likes_count = likes_count - 1 WHERE id = OLD.reel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reel saves count
CREATE OR REPLACE FUNCTION update_reel_saves_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET saves_count = saves_count + 1 WHERE id = NEW.reel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET saves_count = saves_count - 1 WHERE id = OLD.reel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reel shares count
CREATE OR REPLACE FUNCTION update_reel_shares_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET shares_count = shares_count + 1 WHERE id = NEW.reel_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reel comments count
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.post_id AND NEW.post_type = 'reel';
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET comments_count = comments_count - 1 WHERE id = OLD.post_id AND OLD.post_type = 'reel';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_reel_likes_count
    AFTER INSERT OR DELETE ON reel_likes
    FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

CREATE TRIGGER trigger_reel_saves_count
    AFTER INSERT OR DELETE ON reel_saves
    FOR EACH ROW EXECUTE FUNCTION update_reel_saves_count();

CREATE TRIGGER trigger_reel_shares_count
    AFTER INSERT ON reel_shares
    FOR EACH ROW EXECUTE FUNCTION update_reel_shares_count();

CREATE TRIGGER trigger_reel_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

CREATE TRIGGER trigger_reels_updated_at
    BEFORE UPDATE ON reels
    FOR EACH ROW EXECUTE FUNCTION update_reels_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_music ENABLE ROW LEVEL SECURITY;

-- Reels policies
CREATE POLICY "Users can view public reels" ON reels
    FOR SELECT USING (is_public = true AND status = 'active');

CREATE POLICY "Users can view their own reels" ON reels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reels" ON reels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels" ON reels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels" ON reels
    FOR DELETE USING (auth.uid() = user_id);

-- Reel likes policies
CREATE POLICY "Users can view reel likes" ON reel_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like/unlike reels" ON reel_likes
    FOR ALL USING (auth.uid() = user_id);

-- Reel saves policies
CREATE POLICY "Users can view their own saves" ON reel_saves
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save/unsave reels" ON reel_saves
    FOR ALL USING (auth.uid() = user_id);

-- Reel shares policies
CREATE POLICY "Users can view reel shares" ON reel_shares
    FOR SELECT USING (true);

CREATE POLICY "Users can share reels" ON reel_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reel music policies
CREATE POLICY "Users can view reel music" ON reel_music
    FOR SELECT USING (true);

CREATE POLICY "Users can create music for their reels" ON reel_music
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reels 
            WHERE reels.id = reel_music.reel_id 
            AND reels.user_id = auth.uid()
        )
    );

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View for reels with user info and engagement counts
CREATE OR REPLACE VIEW reels_with_users AS
SELECT 
    r.id,
    r.user_id,
    r.video_url,
    r.thumbnail_url,
    r.caption,
    r.duration,
    r.view_count,
    r.likes_count,
    r.comments_count,
    r.shares_count,
    r.saves_count,
    r.hashtags,
    r.location as reel_location,
    r.is_public,
    r.is_featured,
    r.status,
    r.created_at,
    r.updated_at,
    up.username,
    up.avatar,
    up.bio,
    up.location as user_location,
    up.age,
    up.is_host,
    up.hourly_rate,
    up.total_chats,
    up.response_time,
    rm.title as music_title,
    rm.artist as music_artist,
    rm.cover_url as music_cover_url,
    rm.duration as music_duration,
    CASE 
        WHEN rl.id IS NOT NULL THEN true 
        ELSE false 
    END as is_liked,
    CASE 
        WHEN rs.id IS NOT NULL THEN true 
        ELSE false 
    END as is_saved,
    EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 as hours_ago
FROM reels r
LEFT JOIN user_profiles up ON r.user_id = up.id
LEFT JOIN reel_music rm ON r.id = rm.reel_id
LEFT JOIN reel_likes rl ON r.id = rl.reel_id AND rl.user_id = auth.uid()
LEFT JOIN reel_saves rs ON r.id = rs.reel_id AND rs.user_id = auth.uid()
WHERE r.status = 'active' AND r.is_public = true
ORDER BY r.created_at DESC;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample reels (only if user_profiles table has data)
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Get a sample user ID from user_profiles table
    SELECT id INTO sample_user_id FROM user_profiles LIMIT 1;
    
    -- Only insert sample data if we have at least one user
    IF sample_user_id IS NOT NULL THEN
        INSERT INTO reels (id, user_id, video_url, thumbnail_url, caption, duration, view_count, likes_count, comments_count, shares_count, saves_count, hashtags, location, is_public, is_featured) VALUES
        (
            '550e8400-e29b-41d4-a716-446655440001',
            sample_user_id,
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
            'Exploring the mysteries of the night ✨ Nothing beats a midnight adventure in the city!',
            15,
            12500,
            2847,
            156,
            89,
            234,
            ARRAY['#nightlife', '#mystery', '#adventure', '#cityvibes'],
            'Los Angeles, CA',
            true,
            true
        ),
        (
            '550e8400-e29b-41d4-a716-446655440002',
            sample_user_id,
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400',
            'Digital art creation process 🎨 Watch how I bring neon dreams to life!',
            20,
            8900,
            1932,
            89,
            45,
            156,
            ARRAY['#digitalart', '#neon', '#creative', '#process'],
            'San Francisco, CA',
            true,
            false
        ),
        (
            '550e8400-e29b-41d4-a716-446655440003',
            sample_user_id,
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400',
            'Purple aesthetic vibes 💜 Living my best life in this dreamy space!',
            18,
            15600,
            3456,
            234,
            123,
            445,
            ARRAY['#purple', '#aesthetic', '#vibes', '#dreamy'],
            'New York, NY',
            true,
            true
        ),
        (
            '550e8400-e29b-41d4-a716-446655440004',
            sample_user_id,
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400',
            'Stargazing session 🌟 The universe always has something beautiful to show us',
            25,
            7200,
            1789,
            67,
            34,
            89,
            ARRAY['#stargazing', '#universe', '#peace', '#nature'],
            'Chicago, IL',
            true,
            false
        ),
        (
            '550e8400-e29b-41d4-a716-446655440005',
            sample_user_id,
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400',
            'Cyberpunk tech setup 🚀 The future is now and it looks amazing!',
            22,
            18900,
            2654,
            445,
            167,
            567,
            ARRAY['#cyberpunk', '#tech', '#future', '#gaming'],
            'Seattle, WA',
            true,
            true
        );
        
        RAISE NOTICE 'Sample reels inserted successfully using user_id: %', sample_user_id;
    ELSE
        RAISE NOTICE 'No users found in user_profiles table. Skipping sample reel data insertion.';
    END IF;
END $$;

-- Insert sample music data (only if reels exist)
DO $$
DECLARE
    reel_exists BOOLEAN;
BEGIN
    -- Check if any reels exist
    SELECT EXISTS(SELECT 1 FROM reels LIMIT 1) INTO reel_exists;
    
    IF reel_exists THEN
        INSERT INTO reel_music (reel_id, title, artist, cover_url, duration) VALUES
        ('550e8400-e29b-41d4-a716-446655440001', 'Midnight Dreams', 'Cosmic Beats', 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=150', 180),
        ('550e8400-e29b-41d4-a716-446655440002', 'Electronic Vibes', 'Synth Master', 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=150', 240),
        ('550e8400-e29b-41d4-a716-446655440003', 'Purple Rain', 'Dream Pop', 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=150', 216),
        ('550e8400-e29b-41d4-a716-446655440004', 'Cosmic Journey', 'Space Sounds', 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=150', 300),
        ('550e8400-e29b-41d4-a716-446655440005', 'Cyber Dreams', 'Neon Nights', 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=150', 264);
        
        RAISE NOTICE 'Sample music data inserted successfully';
    ELSE
        RAISE NOTICE 'No reels found. Skipping sample music data insertion.';
    END IF;
END $$;

-- Insert sample likes, saves, and shares (only if reels and users exist)
DO $$
DECLARE
    sample_user_id UUID;
    reel_exists BOOLEAN;
BEGIN
    -- Get a sample user ID from user_profiles table
    SELECT id INTO sample_user_id FROM user_profiles LIMIT 1;
    
    -- Check if any reels exist
    SELECT EXISTS(SELECT 1 FROM reels LIMIT 1) INTO reel_exists;
    
    -- Only insert sample data if we have both users and reels
    IF sample_user_id IS NOT NULL AND reel_exists THEN
        -- Insert sample likes
        INSERT INTO reel_likes (reel_id, user_id) VALUES
        ('550e8400-e29b-41d4-a716-446655440002', sample_user_id),
        ('550e8400-e29b-41d4-a716-446655440004', sample_user_id),
        ('550e8400-e29b-41d4-a716-446655440005', sample_user_id);

        -- Insert sample saves
        INSERT INTO reel_saves (reel_id, user_id) VALUES
        ('550e8400-e29b-41d4-a716-446655440003', sample_user_id),
        ('550e8400-e29b-41d4-a716-446655440005', sample_user_id);

        -- Insert sample shares
        INSERT INTO reel_shares (reel_id, user_id, share_type, platform) VALUES
        ('550e8400-e29b-41d4-a716-446655440001', sample_user_id, 'internal', 'story'),
        ('550e8400-e29b-41d4-a716-446655440003', sample_user_id, 'external', 'instagram');
        
        RAISE NOTICE 'Sample engagement data (likes, saves, shares) inserted successfully using user_id: %', sample_user_id;
    ELSE
        RAISE NOTICE 'No users or reels found. Skipping sample engagement data insertion.';
    END IF;
END $$;

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get reels with user engagement
CREATE OR REPLACE FUNCTION get_reels_with_engagement(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    video_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    duration INTEGER,
    view_count INTEGER,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    saves_count INTEGER,
    hashtags TEXT[],
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    username TEXT,
    avatar TEXT,
    bio TEXT,
    is_liked BOOLEAN,
    is_saved BOOLEAN,
    music_title TEXT,
    music_artist TEXT,
    music_cover_url TEXT,
    hours_ago NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.user_id,
        r.video_url,
        r.thumbnail_url,
        r.caption,
        r.duration,
        r.view_count,
        r.likes_count,
        r.comments_count,
        r.shares_count,
        r.saves_count,
        r.hashtags,
        r.location,
        r.created_at,
        up.username,
        up.avatar,
        up.bio,
        CASE WHEN rl.id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN rs.id IS NOT NULL THEN true ELSE false END as is_saved,
        rm.title as music_title,
        rm.artist as music_artist,
        rm.cover_url as music_cover_url,
        EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 as hours_ago
    FROM reels r
    LEFT JOIN user_profiles up ON r.user_id = up.id
    LEFT JOIN reel_music rm ON r.id = rm.reel_id
    LEFT JOIN reel_likes rl ON r.id = rl.reel_id AND rl.user_id = COALESCE(p_user_id, auth.uid())
    LEFT JOIN reel_saves rs ON r.id = rs.reel_id AND rs.user_id = COALESCE(p_user_id, auth.uid())
    WHERE r.status = 'active' AND r.is_public = true
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle reel like
CREATE OR REPLACE FUNCTION toggle_reel_like(p_reel_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if like exists
    SELECT EXISTS(SELECT 1 FROM reel_likes WHERE reel_id = p_reel_id AND user_id = v_user_id) INTO v_exists;
    
    IF v_exists THEN
        -- Remove like
        DELETE FROM reel_likes WHERE reel_id = p_reel_id AND user_id = v_user_id;
        RETURN false;
    ELSE
        -- Add like
        INSERT INTO reel_likes (reel_id, user_id) VALUES (p_reel_id, v_user_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle reel save
CREATE OR REPLACE FUNCTION toggle_reel_save(p_reel_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if save exists
    SELECT EXISTS(SELECT 1 FROM reel_saves WHERE reel_id = p_reel_id AND user_id = v_user_id) INTO v_exists;
    
    IF v_exists THEN
        -- Remove save
        DELETE FROM reel_saves WHERE reel_id = p_reel_id AND user_id = v_user_id;
        RETURN false;
    ELSE
        -- Add save
        INSERT INTO reel_saves (reel_id, user_id) VALUES (p_reel_id, v_user_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment reel view count
CREATE OR REPLACE FUNCTION increment_reel_view(p_reel_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE reels SET view_count = view_count + 1 WHERE id = p_reel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON reels TO authenticated;
GRANT INSERT, UPDATE, DELETE ON reels TO authenticated;
GRANT SELECT ON reel_likes TO authenticated;
GRANT INSERT, DELETE ON reel_likes TO authenticated;
GRANT SELECT ON reel_saves TO authenticated;
GRANT INSERT, DELETE ON reel_saves TO authenticated;
GRANT SELECT ON reel_shares TO authenticated;
GRANT INSERT ON reel_shares TO authenticated;
GRANT SELECT ON reel_music TO authenticated;
GRANT INSERT ON reel_music TO authenticated;
GRANT SELECT ON reels_with_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_reels_with_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_reel_like TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_reel_save TO authenticated;
GRANT EXECUTE ON FUNCTION increment_reel_view TO authenticated;

-- Grant permissions to anon users (for public viewing)
GRANT SELECT ON reels TO anon;
GRANT SELECT ON reel_likes TO anon;
GRANT SELECT ON reel_saves TO anon;
GRANT SELECT ON reel_shares TO anon;
GRANT SELECT ON reel_music TO anon;
GRANT SELECT ON reels_with_users TO anon;
GRANT EXECUTE ON FUNCTION get_reels_with_engagement TO anon;
GRANT EXECUTE ON FUNCTION increment_reel_view TO anon;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Reels system database setup completed successfully!';
    RAISE NOTICE 'Tables created: reels, reel_likes, reel_saves, reel_shares, reel_music';
    RAISE NOTICE 'Views created: reels_with_users';
    RAISE NOTICE 'Functions created: get_reels_with_engagement, toggle_reel_like, toggle_reel_save, increment_reel_view';
    RAISE NOTICE 'Sample data inserted: 5 reels with music, likes, saves, and shares';
END $$;
