-- =====================================================
-- SIMPLE FIX: DISABLE PROBLEMATIC TRIGGERS
-- =====================================================
-- This is a simpler approach - just disable the broken triggers
-- so you can delete posts without the post_type error

-- First, let's see what triggers exist
SELECT 
    trigger_name, 
    event_object_table, 
    action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND (action_statement LIKE '%post_type%' OR trigger_name LIKE '%reel%comment%');

-- Disable the problematic triggers by dropping them
-- These are the triggers that reference the non-existent post_type field

-- Drop all possible comment-related reel triggers
DROP TRIGGER IF EXISTS trigger_reel_comments_count ON comments CASCADE;
DROP TRIGGER IF EXISTS update_reel_comments_count_trigger ON comments CASCADE;
DROP TRIGGER IF EXISTS reel_comments_trigger ON comments CASCADE;

-- Drop all possible like-related reel triggers that might have the same issue
DROP TRIGGER IF EXISTS trigger_reel_likes_count ON likes CASCADE;
DROP TRIGGER IF EXISTS update_reel_likes_count_trigger ON likes CASCADE;
DROP TRIGGER IF EXISTS reel_likes_trigger ON likes CASCADE;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS update_reel_comments_count() CASCADE;
DROP FUNCTION IF EXISTS update_reel_likes_count() CASCADE;

-- Note: This will disable automatic comment/like counting for reels
-- But it will allow you to delete posts without errors
-- You can manually update counts later if needed

-- Optional: Create simple replacement functions that don't use post_type
CREATE OR REPLACE FUNCTION safe_update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if we can confirm this is a reel comment
    -- by checking if the post_id exists in the reels table
    IF TG_OP = 'INSERT' THEN
        UPDATE reels 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels 
        SET comments_count = GREATEST(0, comments_count - 1) 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if you want to re-enable comment counting
-- (Comment out these lines if you just want to disable for now)
/*
CREATE TRIGGER safe_reel_comments_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION safe_update_reel_comments_count();
*/

