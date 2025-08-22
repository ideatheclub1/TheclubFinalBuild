-- =====================================================
-- BULLETIN BOARD STORAGE SETUP (SAFE VERSION)
-- =====================================================
-- Run this in Supabase Dashboard -> SQL Editor
-- Make sure you're running as service_role (use the SQL Editor in dashboard)

-- Step 1: Create storage buckets (run this first)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-images', 'bulletin-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-thumbnails', 'bulletin-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create storage policies for bulletin-images bucket
-- Note: If you get permission errors, run these in the Supabase Dashboard -> Storage -> Policies section

-- Bulletin Images Policies
CREATE POLICY "Anyone can view bulletin images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'bulletin-images');

CREATE POLICY "Users can upload their own bulletin images" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'bulletin-images' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)
  );

CREATE POLICY "Users can update their own bulletin images" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'bulletin-images' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)
  );

CREATE POLICY "Users can delete their own bulletin images" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'bulletin-images' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)
  );

-- Bulletin Thumbnails Policies  
CREATE POLICY "Anyone can view bulletin thumbnails" ON storage.objects 
  FOR SELECT USING (bucket_id = 'bulletin-thumbnails');

CREATE POLICY "Users can upload their own bulletin thumbnails" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'bulletin-thumbnails' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)
  );

CREATE POLICY "Users can update their own bulletin thumbnails" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'bulletin-thumbnails' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)
  );

CREATE POLICY "Users can delete their own bulletin thumbnails" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'bulletin-thumbnails' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)
  );