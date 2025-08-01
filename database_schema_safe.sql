-- =====================================================
-- SAMPLE DATA (INSERT IF NOT EXISTS)
-- =====================================================

-- Insert sample users for testing (only if they don't exist)
INSERT INTO user_profiles (
    id, username, handle, full_name, bio, location, age, 
    is_host, hourly_rate, rating, interests, looking_for,
    latitude, longitude
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    'sarah_j',
    'sarahj',
    'Sarah Johnson',
    'Professional life coach and relationship advisor. Helping people find their path to happiness.',
    'New York, NY',
    28,
    true,
    60.00,
    4.8,
    ARRAY['Life Coaching', 'Relationship Advice', 'Career Guidance'],
    'Everyone',
    40.7128,
    -74.0060
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'mike_chen',
    'mikechen',
    'Michael Chen',
    'Experienced mentor and father figure. Providing guidance and support to those who need it.',
    'Los Angeles, CA',
    35,
    true,
    55.00,
    4.7,
    ARRAY['Father Figure', 'Life Coaching', 'Career Advice'],
    'Everyone',
    34.0522,
    -118.2437
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'emma_davis',
    'emmadavis',
    'Emma Davis',
    'Compassionate listener and emotional support specialist. Here to help you through life\'s challenges.',
    'Chicago, IL',
    24,
    true,
    45.00,
    4.9,
    ARRAY['Emotional Support', 'Active Listening', 'Mental Health'],
    'Everyone',
    41.8781,
    -87.6298
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'david_rodriguez',
    'davidr',
    'David Rodriguez',
    'Career mentor and professional development coach. Helping you achieve your goals.',
    'Miami, FL',
    32,
    true,
    50.00,
    4.6,
    ARRAY['Career Advice', 'Professional Development', 'Leadership'],
    'Everyone',
    25.7617,
    -80.1918
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'lisa_thompson',
    'lisat',
    'Lisa Thompson',
    'Mother figure and family counselor. Providing nurturing support and guidance.',
    'Seattle, WA',
    30,
    true,
    48.00,
    4.8,
    ARRAY['Mother Figure', 'Family Counseling', 'Emotional Support'],
    'Everyone',
    47.6062,
    -122.3321
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample followers relationships
INSERT INTO followers (follower_id, following_id) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Insert sample posts
INSERT INTO posts (id, user_id, content, likes_count, comments_count) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Just finished an amazing coaching session! Remember, every challenge is an opportunity for growth. What are you working on today?',
    12,
    3
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'Being a father figure isn\'t about having all the answers. It\'s about being there, listening, and supporting others on their journey.',
    8,
    2
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'Sometimes the best therapy is just having someone who truly listens. Available for emotional support sessions.',
    15,
    5
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample reviews
INSERT INTO reviews (reviewer_id, reviewed_id, rating, comment) VALUES
(
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    5,
    'Sarah is an incredible life coach. She helped me find clarity in my career decisions.'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    4,
    'Great advice and very supportive. Highly recommend!'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    5,
    'Michael is a wonderful mentor. His fatherly advice has been invaluable.'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440003',
    5,
    'Emma is incredibly empathetic and understanding. Perfect for emotional support.'
)
ON CONFLICT (reviewer_id, reviewed_id) DO NOTHING;

-- =====================================================
-- FINAL SETUP AND VERIFICATION
-- =====================================================

-- Update follower counts for sample data
UPDATE user_profiles SET 
    followers_count = (
        SELECT COUNT(*) FROM followers WHERE following_id = user_profiles.id
    ),
    following_count = (
        SELECT COUNT(*) FROM followers WHERE follower_id = user_profiles.id
    );

-- Update review counts and average ratings
UPDATE user_profiles SET 
    total_reviews = (
        SELECT COUNT(*) FROM reviews WHERE reviewed_id = user_profiles.id
    ),
    rating = (
        SELECT ROUND(AVG(rating)::numeric, 2) 
        FROM reviews 
        WHERE reviewed_id = user_profiles.id
    )
WHERE id IN (
    SELECT DISTINCT reviewed_id FROM reviews
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This completes the safe database schema setup
-- The schema will:
-- 1. Create all necessary tables if they don't exist
-- 2. Add all required indexes for performance
-- 3. Set up functions and triggers for automatic counts
-- 4. Enable Row Level Security with safe policy creation
-- 5. Insert sample data for testing
-- 6. Update all counts and ratings automatically

-- Your SearchScreen should now be able to find and display these users
-- Test the search functionality with terms like:
-- - "sarah" (username search)
-- - "coach" (bio search)
-- - "New York" (location search)
-- - Filter by hosts only
-- - Filter by rating (4.5+)
-- - Filter by age range 