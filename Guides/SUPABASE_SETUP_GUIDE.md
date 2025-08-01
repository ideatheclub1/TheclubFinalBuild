# Supabase Setup Guide - The Club App

This guide will walk you through setting up your Supabase database for The Club app, including dummy user registration without OTP verification.

## 📋 Prerequisites

1. **Supabase Account**: Create an account at [supabase.com](https://supabase.com)
2. **New Project**: Create a new Supabase project
3. **Project URL and API Key**: Note down your project URL and anon key

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `the-club-app`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

### Step 2: Get Project Credentials

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://atqhyfedxsxttnwnyzpd.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

### Step 3: Update App Configuration

1. Open `app/lib/supabase.tsx`
2. Replace the URL and key with your project credentials:

```typescript
const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Step 4: Run Database Setup Script

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the entire content from `database_setup.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute the script

**Expected Output**: The script will create all tables, indexes, policies, and functions.

### Step 5: Configure Authentication Settings

1. Go to **Authentication** → **Settings**
2. Configure the following:

#### Email Templates
- **Confirm signup**: Customize the email template
- **Magic Link**: Customize the magic link template
- **Change email address**: Customize the change email template

#### Auth Settings
- **Enable email confirmations**: **DISABLE** (for development)
- **Enable phone confirmations**: **DISABLE** (for development)
- **Enable manual linking**: **ENABLE**

### Step 6: Create Storage Buckets

1. Go to **Storage** in your Supabase dashboard
2. Create the following buckets:

#### Avatar Bucket
- **Name**: `avatars`
- **Public bucket**: ✅ **ENABLE**
- **File size limit**: `5MB`
- **Allowed MIME types**: `image/*`

#### Posts Bucket
- **Name**: `posts`
- **Public bucket**: ✅ **ENABLE**
- **File size limit**: `10MB`
- **Allowed MIME types**: `image/*`

#### Stories Bucket
- **Name**: `stories`
- **Public bucket**: ✅ **ENABLE**
- **File size limit**: `5MB**
- **Allowed MIME types**: `image/*`

### Step 7: Configure Storage Policies

Run these SQL commands in the SQL Editor:

```sql
-- Avatar policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Posts policies
CREATE POLICY "Post images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Stories policies
CREATE POLICY "Story images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload story images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 8: Test Database Connection

1. Run this query in SQL Editor to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Output**: You should see all 13 tables listed.

### Step 9: Create Sample Data (Optional)

Run this SQL to create sample users for testing:

```sql
-- Insert sample users (replace with actual UUIDs from your auth.users table)
INSERT INTO user_profiles (id, full_name, handle, username, bio, location, age, is_host, hourly_rate)
VALUES 
    (gen_random_uuid(), 'Luna Mystic', 'luna_mystic', 'luna_mystic', 'Exploring the mysteries of the night ✨', 'Los Angeles, CA', 24, true, 200),
    (gen_random_uuid(), 'Neon Dreamer', 'neon_dreamer', 'neon_dreamer', 'Digital artist & night owl 🌙', 'San Francisco, CA', 28, false, 0),
    (gen_random_uuid(), 'Purple Vibes', 'purple_vibes', 'purple_vibes', 'Living in purple dreams 💜', 'New York, NY', 26, true, 150);
```

## 🔧 Development Configuration

### Disable Email Verification (Development Only)

For development, you can disable email verification:

1. Go to **Authentication** → **Settings**
2. Set **Enable email confirmations** to **OFF**
3. Set **Enable phone confirmations** to **OFF**

### Enable Row Level Security

All tables have RLS enabled with appropriate policies. This ensures:
- Users can only access their own data
- Public data (posts, profiles) is accessible to all
- Messages are only visible to conversation participants

## 🧪 Testing the Setup

### Test User Registration

1. Run your app
2. Try registering a new user
3. Check the **Authentication** → **Users** section in Supabase
4. Verify a user profile was created in the **Table Editor** → **user_profiles**

### Test File Upload

1. Try uploading a profile picture
2. Check the **Storage** section in Supabase
3. Verify the file appears in the `avatars` bucket

### Test Database Operations

Run these test queries in SQL Editor:

```sql
-- Check user profiles
SELECT * FROM user_profiles LIMIT 5;

-- Check if triggers are working
SELECT * FROM posts LIMIT 5;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Table doesn't exist" Error
- **Solution**: Make sure you ran the complete `database_setup.sql` script
- **Check**: Go to **Table Editor** and verify all tables exist

#### 2. "Permission denied" Error
- **Solution**: Check RLS policies are correctly set
- **Check**: Verify the user is authenticated

#### 3. "Storage bucket not found" Error
- **Solution**: Create the storage buckets manually
- **Check**: Go to **Storage** section and verify buckets exist

#### 4. "Function not found" Error
- **Solution**: Re-run the functions section of the setup script
- **Check**: Go to **Database** → **Functions** to verify functions exist

### Debug Queries

```sql
-- Check if user profile was created
SELECT * FROM user_profiles WHERE id = 'your-user-id';

-- Check authentication status
SELECT * FROM auth.users WHERE id = 'your-user-id';

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 📱 App Integration

### Update UserContext

The UserContext has been updated to work with the new database structure. Key changes:

1. **Profile fetching**: Now fetches from `user_profiles` table
2. **Host registration**: Creates entries in `host_profiles` table
3. **Authentication**: Properly handles Supabase auth state

### Test Registration Flow

1. **Regular User Registration**:
   - User signs up with email/password
   - Profile is automatically created
   - User can access the app

2. **Host Registration**:
   - User completes host registration form
   - Host profile is created
   - User becomes a host

## 🔒 Security Notes

### Production Considerations

Before going to production:

1. **Enable email verification**:
   - Go to **Authentication** → **Settings**
   - Enable **Email confirmations**

2. **Set up proper email templates**:
   - Customize email templates in **Authentication** → **Templates**

3. **Configure CORS**:
   - Go to **Settings** → **API**
   - Add your app's domain to allowed origins

4. **Set up monitoring**:
   - Enable **Database** → **Logs**
   - Monitor **Authentication** → **Logs**

## ✅ Verification Checklist

- [ ] Database tables created successfully
- [ ] RLS policies configured
- [ ] Storage buckets created
- [ ] Storage policies configured
- [ ] Authentication settings configured
- [ ] App configuration updated
- [ ] User registration tested
- [ ] File upload tested
- [ ] Host registration tested

## 🎉 Next Steps

Once setup is complete:

1. **Test the app** with real user registration
2. **Create sample content** for testing
3. **Set up monitoring** and alerts
4. **Configure backup** strategies
5. **Plan for production** deployment

Your Supabase database is now ready for The Club app! 🚀 