# Debug: Shared Reels Not Available

## What's Happening
When you see "📹 Shared reel no longer available", it means the `message.sharedReel` is undefined/null when the message type is 'reel'.

## Debug Steps Added

### 1. Console Debugging
Added detailed console logging in `services/dataService.ts` to track:
- `shared_reel_id`: The foreign key in the messages table
- `reels`: The joined reel data
- `shared_post_id`: The foreign key for posts  
- `posts`: The joined post data

### 2. Component Debugging
Added console logging in `MediaMessageBubble.tsx` to track:
- When sharedReel is null/undefined
- The complete message object structure

## Check Console Logs

When you load messages, look for these logs:
```
🔍 MESSAGE_MAPPING - Message: {
  id: "message-id",
  type: "reel", 
  shared_reel_id: "reel-id-or-null",
  reels: null // <-- This should contain reel data
}
```

## Possible Issues

### 1. Missing shared_reel_id
If `shared_reel_id` is null, the message wasn't properly created with a reel reference.

### 2. Failed JOIN
If `shared_reel_id` exists but `reels` is null, the JOIN failed - meaning the reel was deleted.

### 3. Database Schema Issue
The `shared_reel_id` column might not exist or the foreign key relationship is broken.

## Quick Fixes to Try

### Run the Database Fix Again
```sql
-- Make sure the shared_reel_id column exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shared_reel_id UUID REFERENCES reels(id);

-- Check if there are any messages with shared reels
SELECT id, message_type, shared_reel_id, content 
FROM messages 
WHERE message_type = 'reel' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test Sharing a New Reel
1. Go to a reel in the app
2. Share it to someone
3. Check the console logs for the new message
4. See if the `shared_reel_id` and `reels` data are populated

## What to Look For in Console

### Good Message (working):
```
🔍 MESSAGE_MAPPING - Message: {
  shared_reel_id: "123e4567-e89b-12d3-a456-426614174000",
  reels: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    video_url: "https://...",
    caption: "Reel caption"
  }
}
```

### Broken Message (not working):
```
🔍 MESSAGE_MAPPING - Message: {
  shared_reel_id: "123e4567-e89b-12d3-a456-426614174000", 
  reels: null // <-- JOIN failed, reel was deleted
}
```

### Missing Reference:
```
🔍 MESSAGE_MAPPING - Message: {
  shared_reel_id: null, // <-- No reel reference saved
  reels: null
}
```









