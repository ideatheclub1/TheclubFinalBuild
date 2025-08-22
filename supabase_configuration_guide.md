# Complete Supabase Configuration Guide for Broadcast Messaging

## 🚀 Overview

This guide provides step-by-step instructions to configure Supabase for the broadcast messaging system in "The Club" app.

## 📋 Prerequisites

- Supabase account
- Supabase project created
- Basic understanding of SQL and Supabase dashboard

## 🛠️ Step-by-Step Setup

### **Step 1: Database Setup**

#### **1.1 Run the SQL Setup Script**

1. **Navigate to SQL Editor**:
   - Go to your Supabase project dashboard
   - Click on **"SQL Editor"** in the left sidebar

2. **Execute the Setup Script**:
   - Copy the entire content of `supabase_broadcast_setup.sql`
   - Paste it into a new SQL query
   - Click **"RUN"** to execute

3. **Verify Tables Created**:
   ```sql
   -- Check if all tables were created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'conversations', 
     'conversation_participants', 
     'messages', 
     'message_read_status', 
     'user_presence'
   );
   ```

#### **1.2 Enable Row Level Security**

The script automatically enables RLS, but verify:

1. Go to **Database** → **Tables**
2. For each table, ensure **"Enable RLS"** is checked:
   - `conversations`
   - `conversation_participants` 
   - `messages`
   - `message_read_status`
   - `user_presence`

### **Step 2: Authentication Configuration**

#### **2.1 Enable Email Authentication**

1. Go to **Authentication** → **Settings**
2. Under **"Auth Providers"**:
   - ✅ Enable **"Email"**
   - ✅ Enable **"Confirm email"** (optional for production)
   - ✅ Enable **"Enable email confirmations"** (optional)

#### **2.2 Configure Auth Settings**

```sql
-- Update auth settings (optional)
UPDATE auth.config SET
  site_url = 'https://your-app-domain.com',
  jwt_expiry_limit = 3600,
  refresh_token_rotation_enabled = true
WHERE id = 1;
```

### **Step 3: Realtime Configuration**

#### **3.1 Enable Realtime**

1. Go to **Database** → **Replication**
2. **Enable Realtime** if not already enabled
3. **Important**: For broadcast messaging, you don't need to add tables to publication
   - Broadcast works independently of database replication

#### **3.2 Configure Realtime Settings**

1. Go to **Settings** → **API**
2. Note your **Project URL** and **Anon Key**
3. Ensure **Realtime** is enabled in your project settings

### **Step 4: Storage Setup (for Media Messages)**

#### **4.1 Create Storage Buckets**

```sql
-- Create buckets for message media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('message-media', 'message-media', false, 52428800, ARRAY['image/*', 'video/*', 'audio/*']),
  ('message-files', 'message-files', false, 104857600, ARRAY['application/*', 'text/*'])
ON CONFLICT (id) DO NOTHING;
```

#### **4.2 Storage Policies**

```sql
-- Policy for message media uploads
CREATE POLICY "Users can upload message media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-media' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy for message media access
CREATE POLICY "Users can access message media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-media' AND
    auth.role() = 'authenticated'
  );

-- Policy for message files
CREATE POLICY "Users can upload message files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-files' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can access message files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-files' AND
    auth.role() = 'authenticated'
  );
```

### **Step 5: Environment Configuration**

#### **5.1 Update Supabase Client Configuration**

Update your `app/lib/supabase.tsx`:

```typescript
import { createClient } from '@supabase/supabase-js';

// Your Supabase project configuration
export const SUPABASE_URL = 'https://your-project-ref.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Enhanced client configuration for broadcast messaging
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit broadcast rate to prevent spam
    },
  },
  global: {
    headers: {
      'x-client-info': 'the-club-app@1.0.0',
    },
  },
});

// Test connection on initialization
supabase.from('user_profiles').select('id').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection test failed:', error);
  } else {
    console.log('✅ Supabase connection test successful:', data?.length, 'records found');
  }
}).catch(err => {
  console.error('❌ Supabase connection test error:', err);
});

// Test broadcast connection
const testChannel = supabase.channel('connection-test');
testChannel
  .on('broadcast', { event: 'test' }, () => {
    console.log('✅ Broadcast messaging is working!');
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime broadcast connected');
      testChannel.send({
        type: 'broadcast',
        event: 'test',
        payload: { message: 'Connection test' }
      });
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Realtime broadcast connection failed');
    }
  });
```

#### **5.2 Environment Variables**

Create/update your `.env.local` or environment configuration:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
EXPO_PUBLIC_APP_NAME=The Club
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### **Step 6: Security Configuration**

#### **6.1 Rate Limiting (Recommended)**

Add rate limiting for broadcast messages:

```sql
-- Create rate limiting function
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS BOOLEAN AS $$
DECLARE
    message_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO message_count
    FROM messages
    WHERE sender_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 minute';
    
    -- Allow max 30 messages per minute per user
    RETURN message_count < 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add check constraint
ALTER TABLE messages ADD CONSTRAINT check_rate_limit 
CHECK (check_message_rate_limit());
```

#### **6.2 Content Filtering (Optional)**

```sql
-- Create content filter function
CREATE OR REPLACE FUNCTION filter_message_content(content TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic content filtering (customize as needed)
    RETURN length(content) > 0 AND length(content) <= 1000;
END;
$$ LANGUAGE plpgsql;

-- Add content validation
ALTER TABLE messages ADD CONSTRAINT check_content_length 
CHECK (filter_message_content(content));
```

### **Step 7: Monitoring and Maintenance**

#### **7.1 Create Monitoring Dashboard**

```sql
-- View for message statistics
CREATE OR REPLACE VIEW message_stats AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as message_count,
    COUNT(DISTINCT sender_id) as active_users,
    COUNT(DISTINCT conversation_id) as active_conversations
FROM messages
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- View for user activity
CREATE OR REPLACE VIEW user_activity AS
SELECT 
    up.user_id,
    prof.username,
    up.status,
    up.last_seen,
    COUNT(m.id) as messages_today
FROM user_presence up
JOIN user_profiles prof ON up.user_id = prof.id
LEFT JOIN messages m ON m.sender_id = up.user_id 
    AND m.created_at > CURRENT_DATE
GROUP BY up.user_id, prof.username, up.status, up.last_seen
ORDER BY up.last_seen DESC;
```

#### **7.2 Automated Cleanup**

Create a cron job or scheduled function:

```sql
-- Create cleanup function to run periodically
CREATE OR REPLACE FUNCTION daily_cleanup()
RETURNS INTEGER AS $$
DECLARE
    total_cleaned INTEGER := 0;
    typing_cleaned INTEGER;
    presence_cleaned INTEGER;
BEGIN
    -- Clean up old typing indicators
    SELECT cleanup_old_typing_indicators() INTO typing_cleaned;
    
    -- Clean up old presence data
    SELECT cleanup_old_presence() INTO presence_cleaned;
    
    -- Delete old soft-deleted messages (older than 30 days)
    DELETE FROM messages 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS total_cleaned = ROW_COUNT;
    
    total_cleaned := total_cleaned + typing_cleaned + presence_cleaned;
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Step 8: Testing the Setup**

#### **8.1 Database Connection Test**

```sql
-- Test basic connectivity
SELECT 
    'Database connected' as status,
    current_timestamp as timestamp,
    current_user as user_role;

-- Test RLS policies
SELECT COUNT(*) as accessible_conversations
FROM conversations;

-- Test functions
SELECT create_conversation('Test Chat', 'direct', ARRAY[]::UUID[]);
```

#### **8.2 Broadcast Test**

Use the `BroadcastTestComponent` in your app:

```typescript
import { BroadcastTestComponent } from '@/components/BroadcastTestComponent';
import { runBroadcastTests } from '@/utils/broadcastTest';

// Run comprehensive tests
const testResults = await runBroadcastTests();
console.log('Broadcast Test Results:', testResults);
```

### **Step 9: Production Checklist**

#### **Before Going Live:**

- [ ] **Database Schema**: All tables created with proper indexes
- [ ] **RLS Policies**: All security policies tested and working
- [ ] **Authentication**: Email/OAuth providers configured
- [ ] **Storage**: Buckets created with proper policies
- [ ] **Environment Variables**: All secrets properly configured
- [ ] **Rate Limiting**: Message rate limits in place
- [ ] **Monitoring**: Dashboard and logging set up
- [ ] **Backup**: Database backup strategy implemented
- [ ] **Testing**: All broadcast functionality tested
- [ ] **Performance**: Query performance optimized
- [ ] **Security**: Security audit completed

#### **Performance Optimization:**

```sql
-- Analyze query performance
EXPLAIN ANALYZE 
SELECT * FROM conversation_list 
WHERE id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = 'user-uuid' AND left_at IS NULL
);

-- Create additional indexes if needed
CREATE INDEX CONCURRENTLY idx_messages_performance 
ON messages (conversation_id, created_at DESC, deleted_at) 
WHERE deleted_at IS NULL;
```

### **Step 10: Troubleshooting**

#### **Common Issues:**

1. **Broadcast Messages Not Received**
   - Check Realtime is enabled
   - Verify channel names match
   - Check browser/network restrictions

2. **Permission Denied Errors**
   - Verify RLS policies
   - Check user authentication
   - Confirm table permissions

3. **High Latency**
   - Check Supabase region
   - Optimize database queries
   - Review network connectivity

4. **Rate Limiting Issues**
   - Adjust rate limit constraints
   - Implement client-side queuing
   - Monitor usage patterns

#### **Debug Queries:**

```sql
-- Check active realtime connections
SELECT * FROM pg_stat_activity 
WHERE application_name LIKE '%realtime%';

-- Monitor message volume
SELECT 
    DATE_TRUNC('minute', created_at) as minute,
    COUNT(*) as messages
FROM messages 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC;

-- Check failed messages
SELECT * FROM messages 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND id NOT IN (
    SELECT DISTINCT message_id 
    FROM message_read_status
);
```

## 🎉 Success Verification

Your Supabase setup is complete when:

✅ **All tables created successfully**  
✅ **RLS policies working correctly**  
✅ **Broadcast messages sending/receiving**  
✅ **Authentication flow working**  
✅ **Storage buckets accessible**  
✅ **Rate limiting active**  
✅ **Monitoring dashboard functional**  

## 📚 Additional Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Broadcast Guide](https://supabase.com/docs/guides/realtime/broadcast)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

This configuration provides a production-ready, scalable messaging system with proper security, monitoring, and performance optimization.
