-- =====================================================
-- POSTS IMAGE FIX - Add sample posts with images
-- =====================================================

-- First, let's check what posts currently exist
SELECT 
    id,
    content,
    image_url,
    created_at,
    user_id
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;

-- Add sample posts with proper images if no posts exist or posts don't have images
DO $$
DECLARE
    sample_user_id UUID;
    existing_posts_count INTEGER;
BEGIN
    -- Get a sample user ID from user_profiles table
    SELECT id INTO sample_user_id FROM user_profiles LIMIT 1;
    
    -- Check how many posts exist
    SELECT COUNT(*) INTO existing_posts_count FROM posts;
    
    -- Only add sample posts if we have a user and either no posts exist or posts don't have images
    IF sample_user_id IS NOT NULL THEN
        
        -- Check if posts exist but don't have images
        IF existing_posts_count = 0 OR NOT EXISTS (
            SELECT 1 FROM posts WHERE image_url IS NOT NULL AND image_url != ''
        ) THEN
            
            -- Insert sample posts with images
            INSERT INTO posts (id, user_id, content, image_url, likes_count, comments_count, is_trending, created_at) VALUES
            (
                gen_random_uuid(),
                sample_user_id,
                'Just had an amazing coffee ☕️ Perfect way to start the day! #coffee #morning #vibes',
                'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
                42,
                8,
                true,
                NOW() - INTERVAL '2 hours'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'Sunset vibes 🌅 Nothing beats this golden hour magic! #sunset #goldenhour #photography',
                'https://images.pexels.com/photos/1563355/pexels-photo-1563355.jpeg?auto=compress&cs=tinysrgb&w=800',
                156,
                23,
                true,
                NOW() - INTERVAL '4 hours'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'Working on some new art 🎨 Creative flow is real today! #art #creative #inspiration',
                'https://images.pexels.com/photos/1029243/pexels-photo-1029243.jpeg?auto=compress&cs=tinysrgb&w=800',
                89,
                15,
                false,
                NOW() - INTERVAL '6 hours'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'City lights at night ✨ Urban photography is my passion! #city #night #photography',
                'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=800',
                234,
                31,
                true,
                NOW() - INTERVAL '8 hours'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'Nature walk today 🌿 Found this beautiful spot! #nature #outdoors #peaceful',
                'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=800',
                67,
                12,
                false,
                NOW() - INTERVAL '12 hours'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'Foodie moment 🍕 This pizza is everything! #food #pizza #delicious',
                'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=800',
                198,
                28,
                true,
                NOW() - INTERVAL '1 day'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'Travel vibes ✈️ Exploring new places is the best feeling! #travel #adventure #explore',
                'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg?auto=compress&cs=tinysrgb&w=800',
                312,
                45,
                true,
                NOW() - INTERVAL '2 days'
            ),
            (
                gen_random_uuid(),
                sample_user_id,
                'Gym session 💪 Staying healthy and strong! #fitness #workout #health',
                'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=800',
                145,
                19,
                false,
                NOW() - INTERVAL '3 days'
            );
            
            RAISE NOTICE 'Sample posts with images inserted successfully using user_id: %', sample_user_id;
        ELSE
            RAISE NOTICE 'Posts with images already exist. No sample data needed.';
        END IF;
    ELSE
        RAISE NOTICE 'No users found in user_profiles table. Cannot create sample posts.';
    END IF;
END $$;

-- Verify the posts now have images
SELECT 
    id,
    content,
    CASE 
        WHEN image_url IS NOT NULL AND image_url != '' THEN 'Has Image'
        ELSE 'No Image'
    END as image_status,
    created_at
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- Check if posts table exists and has the right structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
ORDER BY ordinal_position;

-- Check total count of posts
SELECT COUNT(*) as total_posts FROM posts;

-- Check posts with images vs without images
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as posts_with_images,
    COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as posts_without_images
FROM posts;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Posts image fix completed!';
    RAISE NOTICE 'Check the results above to see if posts now have proper images.';
    RAISE NOTICE 'If you still see blank images, the issue might be:';
    RAISE NOTICE '1. Network connectivity to image URLs';
    RAISE NOTICE '2. Image URLs are not accessible';
    RAISE NOTICE '3. Frontend image loading issue';
END $$;
