# 🧪 Likes Feature Testing Guide

## 🔍 **Debugging the Current Error**

The error you're seeing is:
```
ERROR Error fetching post likes: [TypeError: Cannot read property 'id' of undefined]
```

This means the database query isn't returning the expected user profile data. Here's how to fix and test it:

---

## 🔧 **Step 1: Check Database Setup**

### **Verify Likes Table:**
1. Go to your Supabase Dashboard
2. Navigate to Table Editor
3. Check if the `likes` table exists
4. Verify it has columns: `id`, `user_id`, `post_id`, `created_at`

### **Verify User Profiles Table:**
1. Check if `user_profiles` table exists
2. Verify it has the required columns
3. Make sure there are some user records

### **Check Foreign Key Relationship:**
The query uses `user_profiles!likes_user_id_fkey` - make sure this foreign key exists.

---

## 🧪 **Step 2: Test with Sample Data**

### **Create Test Data:**
```sql
-- Insert a test user if you don't have one
INSERT INTO user_profiles (id, username, handle, full_name, bio) 
VALUES ('test-user-1', 'testuser', 'testuser', 'Test User', 'Test bio')
ON CONFLICT (id) DO NOTHING;

-- Insert a test post
INSERT INTO posts (id, user_id, content) 
VALUES ('test-post-1', 'test-user-1', 'Test post content')
ON CONFLICT (id) DO NOTHING;

-- Insert a test like
INSERT INTO likes (user_id, post_id) 
VALUES ('test-user-1', 'test-post-1')
ON CONFLICT (user_id, post_id) DO NOTHING;
```

---

## 📱 **Step 3: Test the Feature**

### **Manual Testing:**
1. **Open your app** and go to feed
2. **Find a post** (or create one)
3. **Like the post** by tapping the heart icon
4. **Tap the likes count** to open the modal
5. **Check console logs** for debugging info

### **Expected Console Output:**
```
Fetching likes for post: [post-id]
Raw likes data: [array of like objects]
Processing like: {user_id: "...", user_profiles: [...]}
Created user: {id: "...", username: "...", ...}
Final users array: [array of users]
```

---

## 🚨 **Step 4: Common Issues & Solutions**

### **Issue 1: "Cannot read property 'id' of undefined"**
**Cause:** User profile data not properly joined
**Solution:** Check foreign key relationship in database

### **Issue 2: Empty user_profiles array**
**Cause:** No matching user profiles found
**Solution:** Verify user exists in user_profiles table

### **Issue 3: Modal doesn't open**
**Cause:** Tap handler not working
**Solution:** Check if likes count is tappable

### **Issue 4: No likes showing**
**Cause:** No likes in database for that post
**Solution:** Create some test likes

---

## 🔍 **Step 5: Debugging Commands**

### **Check Database Directly:**
```sql
-- Check if likes exist
SELECT * FROM likes WHERE post_id = 'your-post-id';

-- Check if users exist
SELECT * FROM user_profiles;

-- Check the join manually
SELECT l.*, up.* 
FROM likes l 
JOIN user_profiles up ON l.user_id = up.id 
WHERE l.post_id = 'your-post-id';
```

### **Check Console Logs:**
Look for these log messages:
- ✅ `Fetching likes for post: [id]`
- ✅ `Raw likes data: [data]`
- ✅ `Processing like: [like]`
- ✅ `Created user: [user]`
- ✅ `Final users array: [users]`

---

## 🎯 **Step 6: Success Indicators**

### **When Working Correctly:**
- ✅ **Modal opens** when tapping likes count
- ✅ **Loading spinner** appears briefly
- ✅ **User list** shows with avatars and names
- ✅ **Tap user** opens their profile
- ✅ **Empty state** shows for posts with no likes
- ✅ **No console errors**

### **Console Output Should Show:**
```
Fetching likes for post: [post-id]
Raw likes data: [{user_id: "...", user_profiles: [{id: "...", username: "...", ...}]}]
Processing like: {user_id: "...", user_profiles: [...]}
Created user: {id: "...", username: "...", avatar: "...", ...}
Final users array: [{id: "...", username: "...", ...}]
```

---

## 🚀 **Quick Fix Checklist:**

1. **✅ Run the SQL setup** if you haven't already
2. **✅ Create test data** using the SQL above
3. **✅ Restart your app** to clear any cached errors
4. **✅ Test with a fresh post** that you just liked
5. **✅ Check console logs** for debugging info
6. **✅ Verify database relationships** are correct

---

## 📞 **If Still Having Issues:**

1. **Check the console logs** - they'll show exactly what's happening
2. **Verify database setup** - make sure tables and relationships exist
3. **Test with sample data** - create some test likes manually
4. **Check network connectivity** - ensure Supabase connection works
5. **Restart the development server** - clear any cached issues

The debugging logs I added will help identify exactly where the issue is occurring! 🔍✨ 