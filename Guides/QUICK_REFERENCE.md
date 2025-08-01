# Quick Reference Guide - The Club App

## 🚀 Immediate Actions Required

### 1. Set Up Supabase Database
```bash
# 1. Go to supabase.com and create new project
# 2. Copy project URL and anon key
# 3. Update app/lib/supabase.tsx with your credentials
# 4. Run database_setup.sql in Supabase SQL Editor
```

### 2. Configure Authentication
```bash
# In Supabase Dashboard:
# Authentication → Settings → Disable email confirmations
# Storage → Create buckets: avatars, posts, stories
```

### 3. Test the App
```bash
# 1. Run your app
# 2. Register a new user (no email verification needed)
# 3. Try host registration
# 4. Check database tables in Supabase
```

## 📱 App Features Now Available

### ✅ User Registration
- Email/password registration
- No OTP verification (development mode)
- Automatic profile creation
- Session persistence

### ✅ Host Registration
- 7-step registration process
- Database integration
- Auto-approval for development
- Profile status update

### ✅ Authentication Protection
- Automatic redirect to login
- Protected routes
- Session management
- Debug tools

## 🔧 Key Functions

### UserContext Functions
```typescript
// Create dummy user (no email verification)
const success = await createDummyUser(email, password, userData);

// Register as host
const success = await registerHost(hostData);

// Clear all auth data (debug)
await clearAllAuthData();

// Check auth and redirect
checkAuthAndRedirect();
```

### Protected Routes
```typescript
// Wrap any screen with protection
<ProtectedRoute>
  <YourScreen />
</ProtectedRoute>
```

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User information |
| `host_profiles` | Host data |
| `posts` | Social posts |
| `stories` | 24h stories |
| `comments` | Post comments |
| `likes` | Engagement |
| `conversations` | Chat threads |
| `messages` | Individual messages |
| `followers` | Social connections |
| `notifications` | App notifications |
| `bookings` | Host services |
| `reviews` | User feedback |

## 🛠️ Debug Tools

### DebugAuth Component
- Shows in top-right corner (development only)
- Displays auth status
- Clear auth data button

### Console Logging
- Detailed logs with emojis
- Database operation tracking
- Error debugging

## 📋 Testing Checklist

- [ ] User registration works
- [ ] Host registration works
- [ ] Login/logout works
- [ ] Protected routes work
- [ ] Database tables created
- [ ] Storage buckets exist
- [ ] RLS policies active

## 🚨 Common Issues & Solutions

### "Table doesn't exist"
```sql
-- Run database_setup.sql again
-- Check Table Editor in Supabase
```

### "Permission denied"
```sql
-- Check RLS policies
-- Verify user authentication
```

### "Storage bucket not found"
```bash
# Create buckets manually in Supabase Storage
# avars, posts, stories
```

## 📞 Quick Commands

### Check Database
```sql
-- Verify tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check user profiles
SELECT * FROM user_profiles LIMIT 5;

-- Check host profiles
SELECT * FROM host_profiles LIMIT 5;
```

### Check Authentication
```sql
-- Check auth users
SELECT * FROM auth.users LIMIT 5;

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 🎯 Next Steps

1. **Set up Supabase** using `SUPABASE_SETUP_GUIDE.md`
2. **Test registration** with dummy users
3. **Verify database** operations
4. **Remove debug components** before production
5. **Enable email verification** for production

## 📚 Documentation Files

- `database_setup.sql` - Complete database schema
- `SUPABASE_SETUP_GUIDE.md` - Step-by-step setup
- `IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `AUTHENTICATION_GUIDE.md` - Auth system documentation

---

**Your app is ready for development! 🚀**

Users can now register without email verification, become hosts, and all data is properly stored in Supabase. The authentication system ensures users land on the login page when not authenticated. 