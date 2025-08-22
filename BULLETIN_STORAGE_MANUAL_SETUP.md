# Manual Storage Setup for Bulletin Board

If you're getting permission errors with the SQL script, you can set up the storage manually through the Supabase Dashboard:

## Method 1: Use Supabase Dashboard UI

### Step 1: Create Storage Buckets
1. Go to **Storage** in your Supabase Dashboard
2. Click **Create Bucket**
3. Create two buckets:
   - **Name**: `bulletin-images`, **Public**: ✅ Enabled
   - **Name**: `bulletin-thumbnails`, **Public**: ✅ Enabled

### Step 2: Set Storage Policies
1. Go to **Storage** → **Policies**
2. For each bucket, add these policies:

#### For `bulletin-images` bucket:
**SELECT Policy (View)**:
- **Name**: "Anyone can view bulletin images"
- **Allowed operation**: SELECT
- **Target roles**: public
- **USING expression**: `bucket_id = 'bulletin-images'`

**INSERT Policy (Upload)**:
- **Name**: "Users can upload their own bulletin images"  
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **WITH CHECK expression**: `bucket_id = 'bulletin-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)`

**UPDATE Policy**:
- **Name**: "Users can update their own bulletin images"
- **Allowed operation**: UPDATE  
- **Target roles**: authenticated
- **USING expression**: `bucket_id = 'bulletin-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)`

**DELETE Policy**:
- **Name**: "Users can delete their own bulletin images"
- **Allowed operation**: DELETE
- **Target roles**: authenticated  
- **USING expression**: `bucket_id = 'bulletin-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = name)`

#### For `bulletin-thumbnails` bucket:
Repeat the same policies but replace `bulletin-images` with `bulletin-thumbnails` in all expressions.

## Method 2: Try the Safe SQL Script

If you want to use SQL, try running the `database_bulletin_storage_setup_safe.sql` file in the **SQL Editor** of your Supabase Dashboard (not in a client application).

## Method 3: Simplified Bucket Creation Only

If you're still having issues, you can create just the buckets with this minimal SQL:

```sql
-- Only create the buckets (run in Supabase Dashboard SQL Editor)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-images', 'bulletin-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-thumbnails', 'bulletin-thumbnails', true)
ON CONFLICT (id) DO NOTHING;
```

Then set up the policies manually through the UI as described in Method 1.

## Verification

After setup, you should see:
- Two public storage buckets: `bulletin-images` and `bulletin-thumbnails`
- Proper policies allowing users to manage their own images
- Public read access for viewing images

The bulletin board should now work with proper image upload functionality!