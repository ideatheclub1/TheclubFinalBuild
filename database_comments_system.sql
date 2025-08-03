-- Comments System Database Setup
-- This script creates the comments table and related functionality

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
    likes_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comment likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_updated_at();

-- Create function to update likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update likes count
CREATE TRIGGER update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_count();

-- Create function to mark comment as edited
CREATE OR REPLACE FUNCTION mark_comment_edited()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content != NEW.content THEN
        NEW.is_edited = TRUE;
        NEW.edited_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically mark comments as edited
CREATE TRIGGER mark_comment_edited
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION mark_comment_edited();

-- Enable Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments table
-- Users can view comments on posts they can see
CREATE POLICY "Users can view comments on visible posts" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = comments.post_id
            AND (
                p.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM followers f
                    WHERE f.follower_id = auth.uid() AND f.following_id = p.user_id
                )
            )
        )
    );

-- Users can create comments on posts they can see
CREATE POLICY "Users can create comments on visible posts" ON comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = comments.post_id
            AND (
                p.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM followers f
                    WHERE f.follower_id = auth.uid() AND f.following_id = p.user_id
                )
            )
        )
    );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comment_likes table
-- Users can view likes on comments they can see
CREATE POLICY "Users can view comment likes" ON comment_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.id = comment_likes.comment_id
            AND (
                p.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM followers f
                    WHERE f.follower_id = auth.uid() AND f.following_id = p.user_id
                )
            )
        )
    );

-- Users can like/unlike comments they can see
CREATE POLICY "Users can like/unlike comments" ON comment_likes
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.id = comment_likes.comment_id
            AND (
                p.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM followers f
                    WHERE f.follower_id = auth.uid() AND f.following_id = p.user_id
                )
            )
        )
    );

-- Insert sample comments for testing
INSERT INTO comments (post_id, user_id, content, parent_id) VALUES
-- Comments for post 1
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'This is absolutely stunning! 🔥', NULL),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Amazing work! Keep it up ✨', NULL),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Love the energy here! 💜', NULL),

-- Comments for post 2
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Love the colors! 🎨', NULL),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'This is exactly what I needed today! 🚀', NULL),

-- Replies to first comment
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Thank you so much! 💜', 
 (SELECT id FROM comments WHERE post_id = '550e8400-e29b-41d4-a716-446655440001' AND content LIKE '%stunning%' LIMIT 1)),

-- Comments for post 3
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'Incredible shot! 📸', NULL),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440007', 'The lighting is perfect! ✨', NULL);

-- Insert some sample likes
INSERT INTO comment_likes (comment_id, user_id) VALUES
-- Likes for first comment
((SELECT id FROM comments WHERE content LIKE '%stunning%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440002'),
((SELECT id FROM comments WHERE content LIKE '%stunning%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440003'),
((SELECT id FROM comments WHERE content LIKE '%stunning%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440004'),

-- Likes for second comment
((SELECT id FROM comments WHERE content LIKE '%Amazing work%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440001'),
((SELECT id FROM comments WHERE content LIKE '%Amazing work%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440005'),

-- Likes for third comment
((SELECT id FROM comments WHERE content LIKE '%Love the energy%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440006'),
((SELECT id FROM comments WHERE content LIKE '%Love the energy%' LIMIT 1), '550e8400-e29b-41d4-a716-446655440007');

-- Create view for comments with user information
CREATE OR REPLACE VIEW comments_with_users AS
SELECT 
    c.id,
    c.post_id,
    c.user_id,
    c.content,
    c.likes_count,
    c.is_edited,
    c.edited_at,
    c.parent_id,
    c.created_at,
    c.updated_at,
    up.username,
    up.avatar,
    up.bio,
    up.location,
    up.age,
    up.is_host,
    up.hourly_rate,
    up.total_chats,
    up.response_time,
    EXISTS(
        SELECT 1 FROM comment_likes cl 
        WHERE cl.comment_id = c.id AND cl.user_id = auth.uid()
    ) as is_liked_by_current_user
FROM comments c
JOIN user_profiles up ON c.user_id = up.id
ORDER BY c.created_at ASC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON comment_likes TO authenticated;
GRANT SELECT ON comments_with_users TO authenticated; 