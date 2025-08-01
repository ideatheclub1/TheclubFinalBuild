-- =====================================================
-- LOCATION COORDINATES ENHANCEMENT
-- =====================================================
-- This script adds location coordinates and enhances the location system
-- for better nearby people calculation and web-based location search

-- 1. Add location coordinates to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_location_coords ON user_profiles (latitude, longitude);

-- 3. Create a function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to find nearby users
CREATE OR REPLACE FUNCTION find_nearby_users(
    user_lat DECIMAL, 
    user_lon DECIMAL, 
    max_distance_km DECIMAL DEFAULT 50,
    limit_count INTEGER DEFAULT 20
) RETURNS TABLE (
    id UUID,
    full_name TEXT,
    handle TEXT,
    username TEXT,
    avatar TEXT,
    profile_picture TEXT,
    bio TEXT,
    location TEXT,
    age INTEGER,
    distance_km DECIMAL,
    is_host BOOLEAN,
    hourly_rate DECIMAL,
    total_chats INTEGER,
    response_time TEXT,
    rating DECIMAL,
    total_reviews INTEGER,
    profile_completion_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.full_name,
        up.handle,
        up.username,
        up.avatar,
        up.profile_picture,
        up.bio,
        up.location,
        up.age,
        calculate_distance(user_lat, user_lon, up.latitude, up.longitude) as distance_km,
        up.is_host,
        up.hourly_rate,
        up.total_chats,
        up.response_time,
        up.rating,
        up.total_reviews,
        up.profile_completion_percentage
    FROM user_profiles up
    WHERE up.latitude IS NOT NULL 
        AND up.longitude IS NOT NULL
        AND calculate_distance(user_lat, user_lon, up.latitude, up.longitude) <= max_distance_km
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to update user location with coordinates
CREATE OR REPLACE FUNCTION update_user_location(
    user_id UUID,
    new_location TEXT,
    new_latitude DECIMAL,
    new_longitude DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        location = new_location,
        latitude = new_latitude,
        longitude = new_longitude,
        location_updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 6. Create RLS policy for location updates
DROP POLICY IF EXISTS "Users can update their own location" ON user_profiles;

CREATE POLICY "Users can update their own location" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 7. Add comments to document the new fields
COMMENT ON COLUMN user_profiles.latitude IS 'Latitude coordinate for location-based features';
COMMENT ON COLUMN user_profiles.longitude IS 'Longitude coordinate for location-based features';
COMMENT ON COLUMN user_profiles.location_updated_at IS 'Timestamp when location was last updated';
COMMENT ON FUNCTION calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) IS 'Calculate distance between two points using Haversine formula';
COMMENT ON FUNCTION find_nearby_users(DECIMAL, DECIMAL, DECIMAL, INTEGER) IS 'Find users within specified distance using coordinates';
COMMENT ON FUNCTION update_user_location(UUID, TEXT, DECIMAL, DECIMAL) IS 'Update user location with coordinates';

-- 8. Create a trigger to update location_updated_at when coordinates change
CREATE OR REPLACE FUNCTION trigger_update_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
        NEW.location_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_location_timestamp ON user_profiles;

CREATE TRIGGER trigger_update_location_timestamp
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_location_timestamp();

-- 9. Verify the complete user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position; 