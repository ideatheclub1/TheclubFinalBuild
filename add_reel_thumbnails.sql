-- =====================================================
-- ADD THUMBNAIL SUPPORT TO REELS
-- =====================================================
-- This adds thumbnail functionality to the reels system

-- Add thumbnail_url column to reels table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reels' 
        AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE reels ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- Add index for better performance when querying thumbnails
CREATE INDEX IF NOT EXISTS idx_reels_thumbnail_url ON reels(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Update the reels table comment to document the new field
COMMENT ON COLUMN reels.thumbnail_url IS 'URL to the thumbnail image for the reel video';

-- Create a function to generate a default thumbnail URL based on video URL
CREATE OR REPLACE FUNCTION generate_default_thumbnail_url(video_url TEXT)
RETURNS TEXT AS $$
BEGIN
    -- If video_url is null or empty, return null
    IF video_url IS NULL OR video_url = '' THEN
        RETURN NULL;
    END IF;
    
    -- For now, return a placeholder or extract frame from video
    -- In a real implementation, you'd use a video processing service
    RETURN video_url || '_thumbnail.jpg';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate thumbnail URL if not provided
CREATE OR REPLACE FUNCTION set_default_thumbnail()
RETURNS TRIGGER AS $$
BEGIN
    -- If thumbnail_url is not provided but video_url exists, generate a default
    IF NEW.thumbnail_url IS NULL AND NEW.video_url IS NOT NULL THEN
        NEW.thumbnail_url := generate_default_thumbnail_url(NEW.video_url);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating thumbnails
DROP TRIGGER IF EXISTS set_reel_thumbnail_trigger ON reels;
CREATE TRIGGER set_reel_thumbnail_trigger
    BEFORE INSERT OR UPDATE ON reels
    FOR EACH ROW
    EXECUTE FUNCTION set_default_thumbnail();

-- Update existing reels to have thumbnail URLs if they don't have them
UPDATE reels 
SET thumbnail_url = generate_default_thumbnail_url(video_url)
WHERE thumbnail_url IS NULL AND video_url IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON reels TO authenticated;

-- Create a view for reels with thumbnail info for easier querying
CREATE OR REPLACE VIEW reels_with_thumbnails AS
SELECT 
    r.*,
    COALESCE(r.thumbnail_url, generate_default_thumbnail_url(r.video_url)) as display_thumbnail_url,
    up.username,
    up.avatar as user_avatar
FROM reels r
LEFT JOIN user_profiles up ON r.user_id = up.id
ORDER BY r.created_at DESC;
