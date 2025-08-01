-- =====================================================
-- HOST PROFILES RLS POLICIES
-- =====================================================
-- This script adds Row Level Security policies for the host_profiles table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all host profiles" ON host_profiles;
DROP POLICY IF EXISTS "Users can create their own host profile" ON host_profiles;
DROP POLICY IF EXISTS "Users can update their own host profile" ON host_profiles;
DROP POLICY IF EXISTS "Users can delete their own host profile" ON host_profiles;

-- 1. Policy to allow users to view all host profiles
CREATE POLICY "Users can view all host profiles" ON host_profiles
    FOR SELECT USING (true);

-- 2. Policy to allow users to create their own host profile
CREATE POLICY "Users can create their own host profile" ON host_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Policy to allow users to update their own host profile
CREATE POLICY "Users can update their own host profile" ON host_profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Policy to allow users to delete their own host profile
CREATE POLICY "Users can delete their own host profile" ON host_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Verify the policies were created
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
WHERE tablename = 'host_profiles'
ORDER BY policyname; 