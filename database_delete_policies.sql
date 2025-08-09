-- =====================================================
-- DELETE POLICIES FOR POSTS AND REELS
-- =====================================================
-- This file ensures proper Row Level Security (RLS) for delete operations
-- Only users can delete their own posts and reels

-- =====================================================
-- POSTS DELETE POLICIES
-- =====================================================

-- Enable RLS on posts table if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;

-- Create delete policy for posts - users can only delete their own posts
CREATE POLICY "posts_delete_policy" ON posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant delete permission to authenticated users
GRANT DELETE ON posts TO authenticated;

-- =====================================================
-- REELS DELETE POLICIES  
-- =====================================================

-- Enable RLS on reels table if not already enabled
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "reels_delete_policy" ON reels;

-- Create delete policy for reels - users can only delete their own reels
CREATE POLICY "reels_delete_policy" ON reels
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant delete permission to authenticated users
GRANT DELETE ON reels TO authenticated;

-- =====================================================
-- CASCADE DELETE VERIFICATION
-- =====================================================
-- The following tables already have CASCADE DELETE set up properly:

-- POSTS CASCADE DELETE:
-- - post_hashtags (ON DELETE CASCADE)
-- - comments (ON DELETE CASCADE) 
-- - likes (ON DELETE CASCADE)

-- REELS CASCADE DELETE:
-- - reel_hashtags (ON DELETE CASCADE)
-- - likes (ON DELETE CASCADE)
-- - reel_music (ON DELETE CASCADE) if exists

-- =====================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================

-- Function to verify post ownership before delete
CREATE OR REPLACE FUNCTION verify_post_ownership(post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM posts 
    WHERE id = post_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify reel ownership before delete
CREATE OR REPLACE FUNCTION verify_reel_ownership(reel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reels 
    WHERE id = reel_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT LOGGING (OPTIONAL)
-- =====================================================

-- Create audit table for tracking deletions
CREATE TABLE IF NOT EXISTS deletion_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_reason TEXT
);

-- Function to log deletions
CREATE OR REPLACE FUNCTION log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deletion_audit (user_id, table_name, record_id)
  VALUES (auth.uid(), TG_TABLE_NAME, OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for deletion logging (optional - uncomment if needed)
-- DROP TRIGGER IF EXISTS posts_deletion_audit ON posts;
-- CREATE TRIGGER posts_deletion_audit
--   BEFORE DELETE ON posts
--   FOR EACH ROW EXECUTE FUNCTION log_deletion();

-- DROP TRIGGER IF EXISTS reels_deletion_audit ON reels;
-- CREATE TRIGGER reels_deletion_audit
--   BEFORE DELETE ON reels
--   FOR EACH ROW EXECUTE FUNCTION log_deletion();

-- =====================================================
-- GRANT ADDITIONAL PERMISSIONS
-- =====================================================

-- Ensure users can also select and update their own content
GRANT SELECT, UPDATE ON posts TO authenticated;
GRANT SELECT, UPDATE ON reels TO authenticated;

-- Grant access to related tables for cascade operations
GRANT DELETE ON post_hashtags TO authenticated;
GRANT DELETE ON reel_hashtags TO authenticated;
GRANT DELETE ON comments TO authenticated;
GRANT DELETE ON likes TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Use these queries to verify the policies are working:

-- Test posts delete policy:
-- SELECT * FROM posts WHERE user_id = auth.uid(); -- Should show user's posts
-- DELETE FROM posts WHERE id = 'some-post-id' AND user_id = auth.uid(); -- Should work
-- DELETE FROM posts WHERE id = 'some-post-id' AND user_id != auth.uid(); -- Should fail

-- Test reels delete policy:
-- SELECT * FROM reels WHERE user_id = auth.uid(); -- Should show user's reels  
-- DELETE FROM reels WHERE id = 'some-reel-id' AND user_id = auth.uid(); -- Should work
-- DELETE FROM reels WHERE id = 'some-reel-id' AND user_id != auth.uid(); -- Should fail

-- Check if RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('posts', 'reels');

-- View current policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename IN ('posts', 'reels');
