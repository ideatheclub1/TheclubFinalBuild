-- =====================================================
-- DATABASE FIELD ALIGNMENT FIX
-- =====================================================
-- This script ensures all fields in the database match the frontend TypeScript types

-- Check and add missing fields to user_profiles table
-- These fields should match the User interface in types/index.ts

-- 1. Add missing profile completion fields if they don't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT '{}';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS relationship_goals TEXT[] DEFAULT '{}';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS looking_for VARCHAR(20) DEFAULT 'Everyone';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS age_preference_min INTEGER DEFAULT 18;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS age_preference_max INTEGER DEFAULT 50;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS distance_preference INTEGER DEFAULT 50;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add missing follower/following count fields (for future use)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_expertise ON user_profiles USING GIN (expertise);
CREATE INDEX IF NOT EXISTS idx_user_profiles_relationship_goals ON user_profiles USING GIN (relationship_goals);
CREATE INDEX IF NOT EXISTS idx_user_profiles_looking_for ON user_profiles (looking_for);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age_preference ON user_profiles (age_preference_min, age_preference_max);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completion_percentage ON user_profiles (profile_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_user_profiles_followers_count ON user_profiles (followers_count);
CREATE INDEX IF NOT EXISTS idx_user_profiles_following_count ON user_profiles (following_count);

-- 4. Update RLS policies to allow users to update their own profile completion data
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Create or update the profile completion calculation function
CREATE OR REPLACE FUNCTION calculate_profile_completion_percentage()
RETURNS TRIGGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 10; -- Total number of important fields
BEGIN
    -- Basic info (3 points)
    IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.username IS NOT NULL AND NEW.username != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Location (1 point)
    IF NEW.location IS NOT NULL AND NEW.location != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Profile picture (1 point)
    IF NEW.profile_picture IS NOT NULL AND NEW.profile_picture != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Interests (1 point)
    IF NEW.interests IS NOT NULL AND array_length(NEW.interests, 1) > 0 THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Expertise (1 point)
    IF NEW.expertise IS NOT NULL AND array_length(NEW.expertise, 1) > 0 THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Relationship goals (1 point)
    IF NEW.relationship_goals IS NOT NULL AND array_length(NEW.relationship_goals, 1) > 0 THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Looking for (1 point)
    IF NEW.looking_for IS NOT NULL AND NEW.looking_for != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Age and gender (1 point)
    IF NEW.age IS NOT NULL AND NEW.gender IS NOT NULL AND NEW.gender != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Calculate percentage
    NEW.profile_completion_percentage := (completion_score * 100) / total_fields;
    NEW.last_profile_update := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update profile completion percentage
DROP TRIGGER IF EXISTS trigger_calculate_profile_completion ON user_profiles;

CREATE TRIGGER trigger_calculate_profile_completion
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_profile_completion_percentage();

-- 7. Add comments to document all fields
COMMENT ON COLUMN user_profiles.interests IS 'Array of user interests for better matching';
COMMENT ON COLUMN user_profiles.expertise IS 'Array of areas where user can help others';
COMMENT ON COLUMN user_profiles.relationship_goals IS 'Array of relationship goals (e.g., serious, casual, friendship)';
COMMENT ON COLUMN user_profiles.looking_for IS 'Gender preference for matches';
COMMENT ON COLUMN user_profiles.age_preference_min IS 'Minimum age preference for matches';
COMMENT ON COLUMN user_profiles.age_preference_max IS 'Maximum age preference for matches';
COMMENT ON COLUMN user_profiles.distance_preference IS 'Maximum distance preference for matches in kilometers';
COMMENT ON COLUMN user_profiles.profile_completion_percentage IS 'Profile completion percentage (0-100)';
COMMENT ON COLUMN user_profiles.last_profile_update IS 'Timestamp of last profile update';
COMMENT ON COLUMN user_profiles.followers_count IS 'Number of followers (for future use)';
COMMENT ON COLUMN user_profiles.following_count IS 'Number of users being followed (for future use)';

-- 8. Verify the complete user_profiles table structure
-- This should match the User interface in types/index.ts
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position; 