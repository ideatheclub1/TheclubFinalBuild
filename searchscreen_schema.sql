-- =====================================================
-- SEARCHSCREEN SPECIFIC SQL SCHEMA
-- =====================================================
-- This schema contains only the tables and fields needed for SearchScreen.tsx functionality

-- =====================================================
-- USER_PROFILES TABLE (Main table for search functionality)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE,
  handle VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  avatar TEXT,
  profile_picture TEXT,
  bio TEXT,
  location VARCHAR(200),
  age INTEGER CHECK (age >= 18 AND age <= 100),
  is_host BOOLEAN DEFAULT false,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  total_chats INTEGER DEFAULT 0,
  response_time VARCHAR(20) DEFAULT '5 min',
  gender VARCHAR(20),
  date_of_birth DATE,
  is_verified BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  face_data TEXT,
  
  -- Profile completion fields for better match finding
  interests TEXT[] DEFAULT '{}',
  expertise TEXT[] DEFAULT '{}',
  relationship_goals TEXT[] DEFAULT '{}',
  looking_for VARCHAR(50) DEFAULT 'Everyone',
  age_preference_min INTEGER DEFAULT 18,
  age_preference_max INTEGER DEFAULT 50,
  distance_preference INTEGER DEFAULT 50,
  profile_completion_percentage INTEGER DEFAULT 0,
  last_profile_update TIMESTAMP WITH TIME ZONE,
  
  -- Location coordinates for nearby people calculation
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Follower/Following counts
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Community trust score
  community_trust_score INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR SEARCH PERFORMANCE
-- =====================================================

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name ON user_profiles USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_user_profiles_bio ON user_profiles USING gin(to_tsvector('english', bio));
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rating ON user_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hourly_rate ON user_profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_host ON user_profiles(is_host);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_online ON user_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_user_profiles_looking_for ON user_profiles(looking_for);

-- Array indexes for interests
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING gin(interests);

-- Location indexes for nearby search
CREATE INDEX IF NOT EXISTS idx_user_profiles_coordinates ON user_profiles(latitude, longitude);

-- =====================================================
-- SQL FUNCTIONS FOR SEARCH FUNCTIONALITY
-- =====================================================

-- Function to update user location with coordinates
CREATE OR REPLACE FUNCTION update_user_location(
  user_id UUID,
  new_location VARCHAR(200),
  new_latitude DECIMAL(10,8),
  new_longitude DECIMAL(11,8)
) RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    location = new_location,
    latitude = new_latitude,
    longitude = new_longitude,
    location_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby users
CREATE OR REPLACE FUNCTION find_nearby_users(
  user_lat DECIMAL(10,8),
  user_lng DECIMAL(11,8),
  max_distance_km INTEGER DEFAULT 50,
  result_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  username VARCHAR(50),
  full_name VARCHAR(100),
  avatar TEXT,
  location VARCHAR(200),
  age INTEGER,
  is_host BOOLEAN,
  hourly_rate DECIMAL(10,2),
  rating DECIMAL(3,2),
  distance_km DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.username,
    up.full_name,
    up.avatar,
    up.location,
    up.age,
    up.is_host,
    up.hourly_rate,
    up.rating,
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(up.latitude)) * 
        cos(radians(up.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(up.latitude))
      )
    )::DECIMAL(10,2) as distance_km
  FROM user_profiles up
  WHERE 
    up.latitude IS NOT NULL 
    AND up.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(up.latitude)) * 
        cos(radians(up.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(up.latitude))
      )
    ) <= max_distance_km
  ORDER BY distance_km
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all profiles (for search functionality)
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

-- Policy: Users can update only their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- =====================================================
-- SAMPLE DATA FOR TESTING SEARCH FUNCTIONALITY
-- =====================================================

-- Insert sample users for testing search
INSERT INTO user_profiles (
  id, username, full_name, avatar, bio, location, age, is_host, hourly_rate, 
  rating, interests, looking_for, latitude, longitude, is_online
) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'sarah_j',
    'Sarah Johnson',
    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    'Adventure seeker and coffee enthusiast. Love hiking and photography.',
    'New York, NY',
    28,
    true,
    75.00,
    4.5,
    ARRAY['hiking', 'photography', 'coffee', 'travel'],
    'Everyone',
    40.7128,
    -74.0060,
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'mike_dev',
    'Mike Chen',
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    'Software developer by day, musician by night. Always learning new things.',
    'San Francisco, CA',
    32,
    false,
    0.00,
    4.2,
    ARRAY['coding', 'music', 'gaming', 'tech'],
    'Everyone',
    37.7749,
    -122.4194,
    false
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'emma_fitness',
    'Emma Rodriguez',
    'Personal trainer and wellness coach. Helping people achieve their fitness goals.',
    'Los Angeles, CA',
    26,
    true,
    60.00,
    4.8,
    ARRAY['fitness', 'yoga', 'nutrition', 'wellness'],
    'Everyone',
    34.0522,
    -118.2437,
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'alex_art',
    'Alex Thompson',
    'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
    'Artist and creative soul. Love painting, museums, and good conversations.',
    'Chicago, IL',
    30,
    true,
    45.00,
    4.3,
    ARRAY['art', 'painting', 'museums', 'creativity'],
    'Everyone',
    41.8781,
    -87.6298,
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    'david_chef',
    'David Kim',
    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    'Professional chef and food enthusiast. Love cooking and exploring new cuisines.',
    'Miami, FL',
    35,
    true,
    80.00,
    4.7,
    ARRAY['cooking', 'food', 'travel', 'culture'],
    'Everyone',
    25.7617,
    -80.1918,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- USAGE EXAMPLES FOR SEARCH FUNCTIONALITY
-- =====================================================

/*
-- Example 1: Basic text search
SELECT * FROM user_profiles 
WHERE full_name ILIKE '%sarah%' OR bio ILIKE '%coffee%';

-- Example 2: Location-based search
SELECT * FROM user_profiles 
WHERE location ILIKE '%New York%';

-- Example 3: Filter by age range
SELECT * FROM user_profiles 
WHERE age BETWEEN 25 AND 35;

-- Example 4: Filter by rating
SELECT * FROM user_profiles 
WHERE rating >= 4.0;

-- Example 5: Filter by price (hourly rate)
SELECT * FROM user_profiles 
WHERE hourly_rate <= 100;

-- Example 6: Filter by host status
SELECT * FROM user_profiles 
WHERE is_host = true;

-- Example 7: Filter by online status
SELECT * FROM user_profiles 
WHERE is_online = true;

-- Example 8: Filter by interests
SELECT * FROM user_profiles 
WHERE 'hiking' = ANY(interests);

-- Example 9: Find nearby users (using the function)
SELECT * FROM find_nearby_users(40.7128, -74.0060, 50, 10);

-- Example 10: Complex search combining multiple filters
SELECT * FROM user_profiles 
WHERE 
  (full_name ILIKE '%sarah%' OR bio ILIKE '%coffee%')
  AND age BETWEEN 25 AND 35
  AND rating >= 4.0
  AND is_host = true
  AND 'hiking' = ANY(interests);
*/ 