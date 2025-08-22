// Debug script to test image caching functionality
// Add this code to your FeedScreen or any component to test caching

import { cacheService } from './services/cacheService';
import { debugLogger } from './utils/debugLogger';

export const testImageCaching = async () => {
  console.log('🧪 Testing Image Caching System...');
  
  try {
    // Initialize cache service if not already done
    await cacheService.initialize();
    
    // Test cache operations
    const testResults = await cacheService.testCacheOperations();
    
    console.log('✅ Cache Test Results:', testResults);
    
    // Get cache statistics
    const stats = await cacheService.getStats();
    
    console.log('📊 Cache Statistics:');
    console.log('- Platform:', stats.platform);
    console.log('- Memory Cache Items:', stats.memoryCache.totalItems);
    console.log('- Media Cache Items:', stats.mediaCache.totalItems);
    console.log('- Media Cache Size:', (stats.mediaCache.totalSize / 1024 / 1024).toFixed(2) + ' MB');
    console.log('- Web Platform (Media Caching Disabled):', stats.isWebPlatform);
    
    // Test a real image URL
    if (stats.platform !== 'web') {
      console.log('🖼️ Testing image caching with real URL...');
      
      const testImageUrl = 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150';
      
      // First request - should download
      console.time('First image load (download)');
      const cachedPath1 = await cacheService.cacheMedia(testImageUrl, 'thumbnail');
      console.timeEnd('First image load (download)');
      console.log('First load result:', cachedPath1);
      
      // Second request - should use cache
      console.time('Second image load (cached)');
      const cachedPath2 = await cacheService.getCachedMediaPath(testImageUrl);
      console.timeEnd('Second image load (cached)');
      console.log('Second load result:', cachedPath2);
      
      if (cachedPath1 === cachedPath2 && cachedPath1?.includes('file://')) {
        console.log('✅ Image caching is working correctly!');
        console.log('📁 Cached file path:', cachedPath1);
      } else {
        console.log('❌ Image caching may not be working properly');
      }
    } else {
      console.log('🌐 Web platform detected - using browser caching (no file system cache)');
    }
    
    // Get detailed cache info
    const detailedInfo = await cacheService.getDetailedCacheInfo();
    console.log('🔍 Detailed Cache Info:', detailedInfo);
    
    return {
      success: true,
      stats,
      detailedInfo,
      testResults
    };
    
  } catch (error) {
    console.error('❌ Cache testing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// How to use this in your component:
/*

// Add this to any component (like FeedScreen)
import { testImageCaching } from './debug_caching_test';

// In useEffect or button press:
useEffect(() => {
  // Test caching after a short delay
  setTimeout(() => {
    testImageCaching().then(results => {
      console.log('Cache test completed:', results);
    });
  }, 2000);
}, []);

// Or create a debug button:
const handleDebugCache = async () => {
  const results = await testImageCaching();
  Alert.alert(
    'Cache Test Results', 
    `Success: ${results.success}\nMedia Items: ${results.stats?.mediaCache?.totalItems || 0}\nPlatform: ${results.stats?.platform}`
  );
};

*/

// Instructions for monitoring cache behavior:
/*

1. Open your app's debugger console (React Native Debugger, Metro, or browser console)

2. Look for these log messages:
   - "CACHE MEDIA_DOWNLOAD_START" - Image is being downloaded (first time)
   - "CACHE MEDIA_CACHED" - Image has been cached to local storage
   - "CACHE MEDIA_HIT" - Image was loaded from cache (subsequent loads)
   - "CACHE MEDIA_WEB_PASSTHROUGH" - Web platform using original URL (expected)

3. Performance indicators:
   - First load: Should see download logs + longer load time
   - Subsequent loads: Should see cache hit logs + instant load time
   - File paths: Should show "file://" URLs on mobile, original URLs on web

4. Clear cache test:
   - Navigate away and back to see if images load instantly
   - Restart app and check if persistent cache is working
   - Use the cache stats to verify items are being stored

5. Storage verification:
   - Check app's cache directory for media files (mobile only)
   - AsyncStorage should contain cache metadata
   - Memory cache should populate with user/post data

*/

export default testImageCaching;









