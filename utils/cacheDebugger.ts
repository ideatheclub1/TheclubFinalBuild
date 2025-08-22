import { Platform } from 'react-native';
import { debugLogger } from './debugLogger';
import { cacheService } from '@/services/cacheService';

interface CacheDebugInfo {
  platform: string;
  memoryCacheSize: number;
  mediaCacheSize: number;
  asyncStorageKeys: string[];
  totalCacheUsage: {
    memory: number;
    mediaFiles: number;
    asyncStorage: number;
  };
}

class CacheDebugger {
  private isDebugging = false;

  async startDebugging(): Promise<void> {
    if (this.isDebugging) return;
    
    this.isDebugging = true;
    console.log('🐛 CACHE DEBUG MODE STARTED');
    
    // Log initial cache state
    await this.logCacheState();
    
    // Set up periodic cache monitoring
    this.startCacheMonitoring();
  }

  stopDebugging(): void {
    this.isDebugging = false;
    console.log('🐛 CACHE DEBUG MODE STOPPED');
  }

  async logCacheState(): Promise<CacheDebugInfo> {
    const info: CacheDebugInfo = {
      platform: Platform.OS,
      memoryCacheSize: 0,
      mediaCacheSize: 0,
      asyncStorageKeys: [],
      totalCacheUsage: {
        memory: 0,
        mediaFiles: 0,
        asyncStorage: 0,
      },
    };

    try {
      // Get cache statistics from the service
      const stats = await cacheService.getStats();
      info.memoryCacheSize = stats.memoryCache.totalItems;
      info.mediaCacheSize = stats.mediaCache.totalItems;
      info.totalCacheUsage = {
        memory: stats.memoryCache.totalSize,
        mediaFiles: stats.mediaCache.totalSize,
        asyncStorage: stats.persistent.totalSize,
      };

      // Log detailed cache information
      console.group('📊 CACHE STATE ANALYSIS');
      console.log('🖥️  Platform:', info.platform);
      console.log('🧠 Memory Cache Items:', info.memoryCacheSize);
      console.log('📁 Media Cache Items:', info.mediaCacheSize);
      console.log('💾 Memory Usage:', this.formatBytes(info.totalCacheUsage.memory));
      console.log('🎬 Media Files Size:', this.formatBytes(info.totalCacheUsage.mediaFiles));
      console.log('📱 AsyncStorage Size:', this.formatBytes(info.totalCacheUsage.asyncStorage));
      
      if (Platform.OS === 'web') {
        console.log('🌐 Web Platform: File caching disabled, using direct URLs');
      } else {
        console.log('📱 Mobile Platform: Full file caching enabled');
      }
      
      console.groupEnd();

      return info;
    } catch (error) {
      console.error('❌ Failed to get cache state:', error);
      return info;
    }
  }

  async testCacheOperations(): Promise<void> {
    console.group('🧪 CACHE OPERATION TESTS');
    
    try {
      // Test 1: Memory Cache
      console.log('Test 1: Memory Cache Operations');
      const testData = { id: 'test-123', name: 'Cache Test Item', timestamp: Date.now() };
      
      await cacheService.set('posts', 'debug-test', testData);
      console.log('✅ Cache SET operation completed');
      
      const retrieved = await cacheService.get('posts', 'debug-test');
      const cacheWorking = retrieved && retrieved.id === testData.id;
      console.log(cacheWorking ? '✅ Cache GET operation successful' : '❌ Cache GET operation failed');
      
      if (cacheWorking) {
        await cacheService.remove('posts', 'debug-test');
        console.log('✅ Cache REMOVE operation completed');
      }

      // Test 2: Media Cache (only on mobile)
      if (Platform.OS !== 'web') {
        console.log('Test 2: Media Cache Operations (Mobile Only)');
        const testImageUrl = 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150';
        
        console.log('🔄 Testing media cache with test image...');
        const cachedPath = await cacheService.cacheMedia(testImageUrl, 'thumbnail');
        
        if (cachedPath) {
          console.log('✅ Media cache operation successful:', cachedPath);
        } else {
          console.log('❌ Media cache operation failed');
        }
      } else {
        console.log('Test 2: Skipped on web platform (expected behavior)');
      }

      // Test 3: Data Service Integration
      console.log('Test 3: Data Service Cache Integration');
      // This would test the actual cache integration in data service
      console.log('🔄 Testing data service cache integration...');
      
    } catch (error) {
      console.error('❌ Cache test failed:', error);
    }
    
    console.groupEnd();
  }

  async logMediaCacheDetails(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('🌐 Media Cache: Disabled on web platform (using direct URLs)');
      return;
    }

    console.group('🎬 MEDIA CACHE DETAILS');
    
    try {
      const stats = await cacheService.getStats();
      console.log('📊 Total cached media files:', stats.mediaCache.totalItems);
      console.log('💾 Total size:', this.formatBytes(stats.mediaCache.totalSize));
      
      // Try to get some sample cached media info
      console.log('📁 Sample cached media:');
      // This would require additional methods in cache service to list cached items
      
    } catch (error) {
      console.error('❌ Failed to get media cache details:', error);
    }
    
    console.groupEnd();
  }

  private startCacheMonitoring(): void {
    if (!this.isDebugging) return;

    const monitorInterval = setInterval(async () => {
      if (!this.isDebugging) {
        clearInterval(monitorInterval);
        return;
      }

      try {
        const stats = await cacheService.getStats();
        console.log('📊 Cache Monitor:', {
          memory: `${stats.memoryCache.totalItems} items (${this.formatBytes(stats.memoryCache.totalSize)})`,
          media: `${stats.mediaCache.totalItems} files (${this.formatBytes(stats.mediaCache.totalSize)})`,
          storage: this.formatBytes(stats.persistent.totalSize),
        });
      } catch (error) {
        console.warn('⚠️ Cache monitoring error:', error);
      }
    }, 30000); // Monitor every 30 seconds
  }

  async verifyDataServiceIntegration(): Promise<void> {
    console.group('🔗 DATA SERVICE CACHE INTEGRATION');
    
    try {
      // Check if dataService is using cache properly
      console.log('🔄 Testing data service cache usage...');
      
      // This would require checking the actual cache hits/misses in data service
      // We can monitor the debug logs to see if cache is being used
      
      console.log('💡 Monitor console logs for:');
      console.log('  - CACHE_HIT messages for successful cache retrievals');
      console.log('  - CACHE_MISS messages for cache misses');
      console.log('  - CACHE_SET messages for successful cache storage');
      
    } catch (error) {
      console.error('❌ Data service integration test failed:', error);
    }
    
    console.groupEnd();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to log cache operations
  logCacheOperation(operation: string, type: string, key: string, success: boolean, details?: any): void {
    if (!this.isDebugging) return;
    
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} CACHE ${operation.toUpperCase()}: ${type}:${key}`, details || '');
  }

  // Method to check specific URLs in cache
  async checkUrlInCache(url: string): Promise<void> {
    console.group(`🔍 CHECKING URL IN CACHE: ${url}`);
    
    try {
      // Check media cache
      if (Platform.OS !== 'web') {
        const mediaPath = await cacheService.getCachedMediaPath(url);
        if (mediaPath) {
          console.log('✅ Found in media cache:', mediaPath);
        } else {
          console.log('❌ Not found in media cache');
        }
      } else {
        console.log('🌐 Web platform: Media cache check skipped');
      }
      
    } catch (error) {
      console.error('❌ Error checking URL in cache:', error);
    }
    
    console.groupEnd();
  }
}

export const cacheDebugger = new CacheDebugger();

// Global debugging functions for easy access in console
declare global {
  interface Window {
    debugCache: () => Promise<void>;
    testCache: () => Promise<void>;
    monitorCache: () => Promise<void>;
    stopCacheDebug: () => void;
    checkCacheUrl: (url: string) => Promise<void>;
  }
}

// Make debugging functions globally available
if (typeof window !== 'undefined') {
  window.debugCache = () => cacheDebugger.logCacheState().then(() => {});
  window.testCache = () => cacheDebugger.testCacheOperations();
  window.monitorCache = () => cacheDebugger.startDebugging();
  window.stopCacheDebug = () => cacheDebugger.stopDebugging();
  window.checkCacheUrl = (url: string) => cacheDebugger.checkUrlInCache(url);
}

export default cacheDebugger;











