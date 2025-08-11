# Reels Backend Setup Guide

## Overview
This guide will help you set up the complete reels system backend with database tables, triggers, functions, and sample data.

## Prerequisites
- Supabase project set up
- Access to Supabase SQL Editor
- User profiles table already created (from previous setup)

## Setup Steps

### 1. Run the SQL Script
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire content from `database_reels_system.sql`
4. Click "Run" to execute the script

### 2. What the Script Creates

#### Tables:
- `reels` - Main reels table with video metadata
- `reel_likes` - User likes for reels
- `reel_saves` - User saves/bookmarks for reels
- `reel_shares` - Reel sharing history
- `reel_music` - Music information for reels

#### Views:
- `reels_with_users` - Optimized view for fetching reels with user data

#### Functions:
- `get_reels_with_engagement()` - Get reels with user engagement data
- `toggle_reel_like()` - Toggle like/unlike for a reel
- `toggle_reel_save()` - Toggle save/unsave for a reel
- `increment_reel_view()` - Increment view count for a reel

#### Triggers:
- Automatic count updates for likes, saves, shares, and comments
- Automatic timestamp updates

#### Sample Data:
- 5 sample reels with different users
- Music information for each reel
- Sample likes, saves, and shares

### 3. Verify Setup
After running the script, you should see:
- ✅ Tables created successfully
- ✅ Views created successfully
- ✅ Functions created successfully
- ✅ Sample data inserted

### 4. Test the Integration
1. The frontend will now automatically load reels from the database
2. Like, save, and share functionality will work with real data
3. View counts will be tracked automatically
4. Videos will pause when switching screens

## Features Implemented

### Backend Features:
- ✅ Complete reels database schema
- ✅ User engagement tracking (likes, saves, shares)
- ✅ Music information support
- ✅ Hashtag support
- ✅ View count tracking
- ✅ Automatic count updates via triggers
- ✅ Row Level Security (RLS) policies
- ✅ Optimized queries with views

### Frontend Features:
- ✅ Backend integration with real data
- ✅ Like/unlike functionality
- ✅ Save/unsave functionality
- ✅ Share functionality
- ✅ View count tracking
- ✅ Video pause on screen switch
- ✅ Loading states
- ✅ Error handling
- ✅ Pull-to-refresh

## Troubleshooting

### Common Issues:

1. **"Function not found" errors**
   - Make sure you ran the complete SQL script
   - Check that all functions were created successfully

2. **"Table not found" errors**
   - Verify all tables were created
   - Check table names match exactly

3. **Permission errors**
   - Ensure RLS policies are properly set up
   - Check user authentication

4. **Video not playing**
   - Verify video URLs are accessible
   - Check network connectivity

### Debug Information:
- Use the debug panel in the app to see database operations
- Check browser console for detailed error messages
- Monitor Supabase logs for backend errors

## Next Steps

After setup, you can:
1. Create new reels through the app
2. Upload videos to Supabase Storage
3. Add music information to reels
4. Implement additional features like comments
5. Add analytics and reporting

## Support

If you encounter any issues:
1. Check the Supabase logs
2. Verify all SQL executed successfully
3. Test with the sample data first
4. Check the debug panel for detailed information
