-- =====================================================
-- FOLLOWER COUNT TRIGGERS
-- =====================================================
-- This script creates triggers to automatically update follower/following counts

-- Check if triggers already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_follower_counts_insert'
    ) THEN
        -- Function to update follower counts when a new follow relationship is created
        CREATE OR REPLACE FUNCTION update_follower_counts_on_insert()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Increment following_count for the follower
            UPDATE user_profiles 
            SET following_count = following_count + 1
            WHERE id = NEW.follower_id;
            
            -- Increment followers_count for the person being followed
            UPDATE user_profiles 
            SET followers_count = followers_count + 1
            WHERE id = NEW.following_id;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to update follower counts when a follow relationship is deleted
        CREATE OR REPLACE FUNCTION update_follower_counts_on_delete()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Decrement following_count for the follower
            UPDATE user_profiles 
            SET following_count = GREATEST(following_count - 1, 0)
            WHERE id = OLD.follower_id;
            
            -- Decrement followers_count for the person being followed
            UPDATE user_profiles 
            SET followers_count = GREATEST(followers_count - 1, 0)
            WHERE id = OLD.following_id;
            
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;

        -- Create triggers
        CREATE TRIGGER trigger_update_follower_counts_insert
            AFTER INSERT ON followers
            FOR EACH ROW
            EXECUTE FUNCTION update_follower_counts_on_insert();

        CREATE TRIGGER trigger_update_follower_counts_delete
            AFTER DELETE ON followers
            FOR EACH ROW
            EXECUTE FUNCTION update_follower_counts_on_delete();

        RAISE NOTICE 'Follower count triggers created successfully';
    ELSE
        RAISE NOTICE 'Follower count triggers already exist';
    END IF;
END $$;

-- Initialize follower counts for existing data
-- This will set the correct counts based on existing follower relationships
UPDATE user_profiles 
SET 
    followers_count = (
        SELECT COUNT(*) 
        FROM followers 
        WHERE following_id = user_profiles.id
    ),
    following_count = (
        SELECT COUNT(*) 
        FROM followers 
        WHERE follower_id = user_profiles.id
    );

-- Add comments
COMMENT ON FUNCTION update_follower_counts_on_insert() IS 'Automatically updates follower/following counts when a new follow relationship is created';
COMMENT ON FUNCTION update_follower_counts_on_delete() IS 'Automatically updates follower/following counts when a follow relationship is deleted';
COMMENT ON TRIGGER trigger_update_follower_counts_insert ON followers IS 'Trigger to update counts on follow';
COMMENT ON TRIGGER trigger_update_follower_counts_delete ON followers IS 'Trigger to update counts on unfollow';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%follower%'
ORDER BY trigger_name;

-- Check current follower counts for verification
SELECT 
    id,
    full_name,
    followers_count,
    following_count
FROM user_profiles 
WHERE followers_count > 0 OR following_count > 0
ORDER BY followers_count DESC, following_count DESC
LIMIT 10;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This completes the follower count triggers setup
-- The triggers will automatically update follower/following counts
-- when users follow or unfollow each other 