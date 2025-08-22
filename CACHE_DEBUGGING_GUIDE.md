# 🐛 Cache Debugging System Guide

## Overview
A comprehensive debugging system to verify, test, and monitor the caching functionality in your app.

## 🚀 Quick Start

### Option 1: Debug Panel (Visual UI)
1. **Open the app** in development mode
2. **Navigate to Reels screen**
3. **Tap the 🐛 debug button** (top-right corner, only visible in dev mode)
4. **Use the debug panel** to:
   - View cache statistics
   - Run cache tests
   - Inspect detailed cache contents
   - Monitor real-time cache usage

### Option 2: Console Commands (Developer Tools)
Open browser developer tools console and run:

```javascript
// View cache statistics
await window.debugCache()

// Run comprehensive cache tests
await window.testCache()

// Get detailed cache contents
await window.detailedCacheInfo()
```

## 📊 What to Look For

### ✅ **Healthy Cache Behavior**
- **Memory Cache**: Shows items being stored and retrieved
- **Platform Detection**: Correctly identifies web vs mobile
- **Web Platform**: Media caching disabled (expected)
- **Mobile Platform**: Media files being cached locally
- **Cache Hits**: Should see "CACHE_HIT" logs for repeated requests
- **Cache Misses**: Should see "CACHE_MISS" logs for new requests

### 🔍 **Key Metrics to Monitor**

#### Memory Cache
- **Items**: Number of cached objects (posts, reels, users)
- **Size**: Memory usage in bytes
- **By Type**: Breakdown by data type (posts: X, reels: Y, etc.)

#### Media Cache (Mobile Only)
- **Files**: Number of cached media files
- **Size**: Total disk space used
- **Age**: Oldest and newest cached items

#### Platform Behavior
- **Web**: `mediaCacheDisabled: true` (expected)
- **Mobile**: `mediaCacheDisabled: false` (expected)

## 🧪 Test Results Interpretation

### Memory Cache Tests
- **SET**: Should always pass
- **GET**: Should return the stored data
- **REMOVE**: Should successfully delete items

### Media Cache Tests
- **Mobile**: Should download and cache a test image
- **Web**: Should be skipped (expected behavior)

### Cache Stats Tests
- **Should generate statistics** without errors
- **Should include platform information**
- **Should show accurate item counts**

## 🔍 Console Log Patterns

### Normal Operation
```
🐛 Cache debugging functions available:
  - window.debugCache() - Show cache statistics
  - window.testCache() - Run cache tests
  - window.detailedCacheInfo() - Show detailed cache contents

📊 CACHE | STATS_GENERATED | Cache statistics generated
🌐 CACHE | MEDIA_WEB_PASSTHROUGH | Web platform: using original URL
✅ CACHE | HIT_posts_GET_POSTS | Cache hit for posts
❌ CACHE | MISS_posts_GET_POSTS | Cache miss for posts - fetching fresh data
```

### Problem Indicators
```
❌ CACHE | ERROR_* | Various cache operation failures
❌ CACHE | TEST_ERROR | Cache test suite failed
⚠️  CACHE | MEDIA_CACHE_ERROR | Failed to cache media (on mobile)
```

## 🛠️ Debugging Common Issues

### Issue: No Cache Activity
**Symptoms**: No cache logs, tests failing
**Solution**: 
- Check if `cacheService.initialize()` was called
- Verify AsyncStorage permissions
- Check network connectivity

### Issue: Media Cache Errors on Web
**Symptoms**: `ERR_UNAVAILABLE` errors
**Expected**: This is normal behavior - web platform skips media caching

### Issue: Memory Cache Not Working
**Symptoms**: Cache GET always returns null
**Check**:
- TTL settings (items might be expiring)
- Memory limits (cache might be full)
- Key generation (ensure consistent naming)

### Issue: High Memory Usage
**Symptoms**: App performance issues
**Actions**:
- Check cache size limits in config
- Run cleanup manually
- Monitor cache statistics over time

## 📱 Debug Panel Features

### Statistics Tab
- **Platform info**: Current platform and cache status
- **Memory usage**: Items and size by type
- **Media cache**: File count and disk usage
- **AsyncStorage**: Persistent cache statistics

### Test Tab
- **Memory tests**: SET/GET/REMOVE operations
- **Media tests**: File download and caching (mobile only)
- **Integration tests**: End-to-end cache workflows

### Details Tab
- **Raw cache contents**: JSON view of cached data
- **Sample keys**: Preview of stored cache keys
- **Cache metadata**: Timestamps, access patterns

## 🔧 Advanced Debugging

### Monitor Cache Over Time
The debug panel includes real-time monitoring that logs cache stats every 30 seconds when active.

### Custom Cache Testing
Add custom test scenarios by modifying the `testCacheOperations` method in `cacheService.ts`.

### Cache Performance Analysis
Use the detailed cache info to analyze:
- **Cache hit ratios**: How often cache is used vs fresh requests
- **Cache efficiency**: Which data types benefit most from caching
- **Memory patterns**: Growth and cleanup cycles

## 🚨 Troubleshooting

### Debug Panel Won't Open
- Ensure you're in development mode (`__DEV__ === true`)
- Check that you're on the Reels screen
- Look for React errors in console

### Console Commands Not Available
- Ensure you're on web platform
- Check browser console for initialization logs
- Verify `window.debugCache` exists

### Cache Tests Failing
- Check network connectivity
- Verify AsyncStorage permissions
- Look for specific error messages in results
- Run tests individually to isolate issues

## 📈 Expected Performance

### Web Platform
- **Memory Cache**: Full functionality
- **Media Cache**: Disabled (uses browser cache)
- **Performance**: Immediate media loading

### Mobile Platform
- **Memory Cache**: Full functionality  
- **Media Cache**: Local file storage
- **Performance**: Faster subsequent loads, offline support

## 💡 Best Practices

1. **Regular Monitoring**: Run cache tests periodically during development
2. **Performance Testing**: Monitor cache statistics during heavy usage
3. **Platform Testing**: Test on both web and mobile platforms
4. **Cache Cleanup**: Verify automatic cleanup is working
5. **Error Handling**: Check that cache failures don't break app functionality

## 🎯 Success Criteria

Your cache is working correctly if:
- ✅ Memory cache tests pass
- ✅ Platform-appropriate media caching behavior
- ✅ Cache statistics generate without errors
- ✅ Console shows cache hits for repeated requests
- ✅ No critical cache errors in normal operation
- ✅ App performance improves with caching enabled











