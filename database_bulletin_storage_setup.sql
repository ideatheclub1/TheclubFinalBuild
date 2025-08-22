-- =====================================================
-- BULLETIN BOARD STORAGE SETUP
-- =====================================================

-- Create bulletin-images bucket for full resolution images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-images', 'bulletin-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create bulletin-thumbnails bucket for thumbnail images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-thumbnails', 'bulletin-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for bulletin-images bucket
CREATE POLICY "Anyone can view bulletin images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'bulletin-images');

CREATE POLICY "Users can upload their own bulletin images" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'bulletin-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own bulletin images" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'bulletin-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own bulletin images" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'bulletin-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Set up storage policies for bulletin-thumbnails bucket
CREATE POLICY "Anyone can view bulletin thumbnails" ON storage.objects 
  FOR SELECT USING (bucket_id = 'bulletin-thumbnails');

CREATE POLICY "Users can upload their own bulletin thumbnails" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'bulletin-thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own bulletin thumbnails" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'bulletin-thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own bulletin thumbnails" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'bulletin-thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;