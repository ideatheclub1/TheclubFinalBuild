-- =====================================================
-- FOLLOWER RLS POLICIES FIX
-- =====================================================
-- This script adds the missing RLS policies for the followers table

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all followers" ON followers;
DROP POLICY IF EXISTS "Users can create their own follows" ON followers;
DROP POLICY IF EXISTS "Users can delete their own follows" ON followers;

-- Create the missing RLS policies for followers table
CREATE POLICY "Users can view all followers" ON followers FOR SELECT USING (true);
CREATE POLICY "Users can create their own follows" ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete their own follows" ON followers FOR DELETE USING (auth.uid() = follower_id);

-- =====================================================
-- NOTIFICATIONS RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create RLS policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- BOOKINGS RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON bookings;

-- Create RLS policies for bookings table
CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = host_id OR auth.uid() = client_id);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update their own bookings" ON bookings FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = client_id);
CREATE POLICY "Users can delete their own bookings" ON bookings FOR DELETE USING (auth.uid() = host_id OR auth.uid() = client_id);

-- Add comments
COMMENT ON POLICY "Users can view all followers" ON followers IS 'Allow all users to view follower relationships';
COMMENT ON POLICY "Users can create their own follows" ON followers IS 'Allow users to create their own follow relationships';
COMMENT ON POLICY "Users can delete their own follows" ON followers IS 'Allow users to delete their own follow relationships';

COMMENT ON POLICY "Users can view their own notifications" ON notifications IS 'Allow users to view their own notifications';
COMMENT ON POLICY "Users can create notifications" ON notifications IS 'Allow users to create notifications';
COMMENT ON POLICY "Users can update their own notifications" ON notifications IS 'Allow users to update their own notifications';
COMMENT ON POLICY "Users can delete their own notifications" ON notifications IS 'Allow users to delete their own notifications';

COMMENT ON POLICY "Users can view their own bookings" ON bookings IS 'Allow users to view bookings they are involved in';
COMMENT ON POLICY "Users can create bookings" ON bookings IS 'Allow users to create bookings as clients';
COMMENT ON POLICY "Users can update their own bookings" ON bookings IS 'Allow users to update bookings they are involved in';
COMMENT ON POLICY "Users can delete their own bookings" ON bookings IS 'Allow users to delete bookings they are involved in';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('followers', 'notifications', 'bookings')
ORDER BY tablename, policyname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This completes the RLS policies fix for followers, notifications, and bookings tables
-- These tables should now be accessible on all platforms
-- Test the followers/following functionality on mobile devices 