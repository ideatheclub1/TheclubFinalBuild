-- =====================================================
-- FIX POST_TYPE TRIGGER ERROR
-- =====================================================
-- This fixes the "record 'old' has no field 'post_type'" error
-- by updating the trigger function to not reference the non-existent field

-- Drop the problematic trigger first (check all possible trigger names)
DROP TRIGGER IF EXISTS update_reel_comments_count_trigger ON comments;
DROP TRIGGER IF EXISTS trigger_reel_comments_count ON comments;

-- Drop the problematic function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS update_reel_comments_count() CASCADE;

-- Create a new, corrected function that doesn't reference post_type
-- Instead, we'll determine if it's a reel comment by checking if the post_id exists in reels table
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Check if this comment is for a reel by looking up the post_id in reels table
        IF EXISTS (SELECT 1 FROM reels WHERE id = NEW.post_id) THEN
            UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if this comment was for a reel by looking up the post_id in reels table
        IF EXISTS (SELECT 1 FROM reels WHERE id = OLD.post_id) THEN
            UPDATE reels SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_reel_comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_reel_comments_count();

-- Also create a similar function for posts comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Check if this comment is for a post by looking up the post_id in posts table
        IF EXISTS (SELECT 1 FROM posts WHERE id = NEW.post_id) THEN
            UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if this comment was for a post by looking up the post_id in posts table
        IF EXISTS (SELECT 1 FROM posts WHERE id = OLD.post_id) THEN
            UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for posts comments count
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON comments;
CREATE TRIGGER update_post_comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_count();

-- Now let's also check for any similar issues with likes table
-- Drop and recreate likes triggers if they have the same issue

-- Check if we have problematic likes triggers (check all possible names)
DROP TRIGGER IF EXISTS update_reel_likes_count_trigger ON likes;
DROP TRIGGER IF EXISTS trigger_reel_likes_count ON likes;
DROP FUNCTION IF EXISTS update_reel_likes_count() CASCADE;

CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Check if this like is for a reel
        IF EXISTS (SELECT 1 FROM reels WHERE id = NEW.post_id) THEN
            UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if this like was for a reel
        IF EXISTS (SELECT 1 FROM reels WHERE id = OLD.post_id) THEN
            UPDATE reels SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reel_likes_count_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_reel_likes_count();

-- Create similar function for posts likes
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON likes;
DROP TRIGGER IF EXISTS trigger_post_likes_count ON likes;
DROP FUNCTION IF EXISTS update_post_likes_count() CASCADE;

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Check if this like is for a post
        IF EXISTS (SELECT 1 FROM posts WHERE id = NEW.post_id) THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if this like was for a post
        IF EXISTS (SELECT 1 FROM posts WHERE id = OLD.post_id) THEN
            UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_likes_count_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();
