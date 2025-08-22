import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { debugLogger } from '@/utils/debugLogger';
import { Post, Reel, User, Story, Comment } from '@/types';

// =====================================================
// CACHE CONFIGURATION
// =====================================================

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxItems: number; // Maximum number of items to cache
  persistToDisk: boolean; // Whether to save to AsyncStorage
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  size?: number; // Size in bytes for memory management
}

interface MediaCacheItem {
  localPath: string;
  originalUrl: string;
  timestamp: number;
  lastAccessed: number;
  size: number;
}

// Cache configurations for different data types
const CACHE_CONFIGS = {
  posts: { ttl: 5 * 60 * 1000, maxItems: 100, persistToDisk: true }, // 5 minutes
  reels: { ttl: 10 * 60 * 1000, maxItems: 50, persistToDisk: true }, // 10 minutes  
  users: { ttl: 30 * 60 * 1000, maxItems: 200, persistToDisk: true }, // 30 minutes
  stories: { ttl: 2 * 60 * 1000, maxItems: 50, persistToDisk: false }, // 2 minutes
  comments: { ttl: 5 * 60 * 1000, maxItems: 500, persistToDisk: false }, // 5 minutes
  media: { ttl: 24 * 60 * 60 * 1000, maxItems: 100, persistToDisk: false }, // 24 hours
  thumbnails: { ttl: 7 * 24 * 60 * 60 * 1000, maxItems: 200, persistToDisk: false }, // 7 days
} as const;

// =====================================================
// MAIN CACHE SERVICE
// =====================================================

class CacheService {
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  private mediaCache: Map<string, MediaCacheItem> = new Map();
  private isInitialized = false;

  // =====================================================
  // INITIALIZATION
  // =====================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      debugLogger.info('CACHE', 'INIT_START', 'Initializing cache service');
      
      // Load persistent cache from AsyncStorage
      await this.loadPersistentCache();
      
      // Initialize media cache directory
      await this.initializeMediaCache();
      
      // Start cleanup interval
      this.startCleanupInterval();
      
      this.isInitialized = true;
      debugLogger.info('CACHE', 'INIT_SUCCESS', 'Cache service initialized successfully');
    } catch (error) {
      debugLogger.error('CACHE', 'INIT_ERROR', 'Failed to initialize cache service', error);
    }
  }

  private async loadPersistentCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache:'));
      
      if (cacheKeys.length === 0) return;
      
      const items = await AsyncStorage.multiGet(cacheKeys);
      
      for (const [key, value] of items) {
        if (value) {
          try {
            const parsed = JSON.parse(value);
            this.memoryCache.set(key.replace('cache:', ''), parsed);
          } catch (parseError) {
            debugLogger.error('CACHE', 'LOAD_ITEM_ERROR', `Failed to parse cache item: ${key}`, parseError);
          }
        }
      }
      
      debugLogger.info('CACHE', 'LOAD_SUCCESS', `Loaded ${items.length} cache items from storage`);
    } catch (error) {
      debugLogger.error('CACHE', 'LOAD_ERROR', 'Failed to load persistent cache', error);
    }
  }

  private async initializeMediaCache(): Promise<void> {
    try {
      // Skip media cache initialization on web platform
      if (Platform.OS === 'web') {
        debugLogger.info('CACHE', 'MEDIA_WEB_SKIP', 'Skipping media cache initialization on web platform');
        return;
      }

      const cacheDir = `${FileSystem.cacheDirectory}media/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        debugLogger.info('CACHE', 'MEDIA_DIR_CREATED', `Created media cache directory: ${cacheDir}`);
      }
      
      // Load existing media cache info from storage
      const mediaCacheData = await AsyncStorage.getItem('mediaCache');
      if (mediaCacheData) {
        const parsed = JSON.parse(mediaCacheData);
        this.mediaCache = new Map(Object.entries(parsed));
        debugLogger.info('CACHE', 'MEDIA_CACHE_LOADED', `Loaded ${this.mediaCache.size} media cache entries`);
      }
    } catch (error) {
      debugLogger.error('CACHE', 'MEDIA_INIT_ERROR', 'Failed to initialize media cache', error);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired items every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // =====================================================
  // MEMORY CACHE OPERATIONS
  // =====================================================

  async set<T>(
    type: keyof typeof CACHE_CONFIGS,
    key: string,
    data: T,
    customTtl?: number
  ): Promise<void> {
    try {
      const config = CACHE_CONFIGS[type];
      const cacheKey = `${type}:${key}`;
      const now = Date.now();
      
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: now,
        lastAccessed: now,
        size: JSON.stringify(data).length,
      };

      // Add to memory cache
      this.memoryCache.set(cacheKey, cacheItem);
      
      // Enforce max items limit
      await this.enforceMaxItems(type);
      
      // Persist to disk if configured
      if (config.persistToDisk) {
        await this.persistItem(cacheKey, cacheItem);
      }
      
      // Reduce verbose cache logging
      if (__DEV__ && Math.random() < 0.05) {
        debugLogger.info('CACHE', 'SET_SUCCESS', `Cached ${type} item: ${key}`);
      }
    } catch (error) {
      debugLogger.error('CACHE', 'SET_ERROR', `Failed to cache ${type} item: ${key}`, error);
    }
  }

  async get<T>(type: keyof typeof CACHE_CONFIGS, key: string): Promise<T | null> {
    try {
      const config = CACHE_CONFIGS[type];
      const cacheKey = `${type}:${key}`;
      const item = this.memoryCache.get(cacheKey);
      
      if (!item) {
        // Reduce cache miss logging
        if (__DEV__ && Math.random() < 0.02) {
          debugLogger.info('CACHE', 'MISS', `Cache miss for ${type}:${key}`);
        }
        return null;
      }
      
      const now = Date.now();
      
      // Check if expired
      if (now - item.timestamp > config.ttl) {
        this.memoryCache.delete(cacheKey);
        await this.removePersistentItem(cacheKey);
        debugLogger.info('CACHE', 'EXPIRED', `Cache expired for ${type}:${key}`);
        return null;
      }
      
      // Update last accessed time
      item.lastAccessed = now;
      
      // Reduce cache hit logging
      if (__DEV__ && Math.random() < 0.01) {
        debugLogger.info('CACHE', 'HIT', `Cache hit for ${type}:${key}`);
      }
      return item.data as T;
    } catch (error) {
      debugLogger.error('CACHE', 'GET_ERROR', `Failed to get ${type} item: ${key}`, error);
      return null;
    }
  }

  async delete(type: keyof typeof CACHE_CONFIGS, key: string): Promise<void> {
    try {
      const cacheKey = `${type}:${key}`;
      this.memoryCache.delete(cacheKey);
      await this.removePersistentItem(cacheKey);
      debugLogger.info('CACHE', 'DELETE_SUCCESS', `Deleted cache item: ${cacheKey}`);
    } catch (error) {
      debugLogger.error('CACHE', 'DELETE_ERROR', `Failed to delete cache item: ${type}:${key}`, error);
    }
  }

  async clear(type?: keyof typeof CACHE_CONFIGS): Promise<void> {
    try {
      if (type) {
        // Clear specific type
        const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => key.startsWith(`${type}:`));
        for (const key of keysToDelete) {
          this.memoryCache.delete(key);
          await this.removePersistentItem(key);
        }
        debugLogger.info('CACHE', 'CLEAR_TYPE', `Cleared ${type} cache (${keysToDelete.length} items)`);
      } else {
        // Clear all
        this.memoryCache.clear();
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith('cache:'));
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
        }
        debugLogger.info('CACHE', 'CLEAR_ALL', `Cleared all cache (${cacheKeys.length} items)`);
      }
    } catch (error) {
      debugLogger.error('CACHE', 'CLEAR_ERROR', `Failed to clear cache`, error);
    }
  }

  // =====================================================
  // MEDIA CACHE OPERATIONS
  // =====================================================

  async cacheMedia(url: string, type: 'image' | 'video' | 'thumbnail'): Promise<string | null> {
    try {
      // On web platform, skip file caching and return the original URL
      if (Platform.OS === 'web') {
        // Reduce web platform logging
      if (__DEV__ && Math.random() < 0.005) {
        debugLogger.info('CACHE', 'MEDIA_WEB_PASSTHROUGH', `Web platform: using original URL: ${url}`);
      }
      return url;
      }

      // Check if already cached
      const existing = this.mediaCache.get(url);
      if (existing) {
        const fileExists = await FileSystem.getInfoAsync(existing.localPath);
        if (fileExists.exists) {
          existing.lastAccessed = Date.now();
          // Reduce media cache hit logging
          if (__DEV__ && Math.random() < 0.02) {
            debugLogger.info('CACHE', 'MEDIA_HIT', `Media cache hit: ${url}`);
          }
          return existing.localPath;
        } else {
          // File was deleted, remove from cache
          this.mediaCache.delete(url);
        }
      }

      // Download and cache the media
      const extension = url.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
      const localPath = `${FileSystem.cacheDirectory}media/${fileName}`;

      debugLogger.info('CACHE', 'MEDIA_DOWNLOAD_START', `Downloading media: ${url}`);
      
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        const cacheItem: MediaCacheItem = {
          localPath,
          originalUrl: url,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        };

        this.mediaCache.set(url, cacheItem);
        await this.persistMediaCache();
        
        // Enforce cache size limits
        await this.enforceMediaCacheSize();
        
        debugLogger.info('CACHE', 'MEDIA_CACHED', `Media cached: ${url} -> ${localPath} (${fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 'unknown'} bytes)`);
        return localPath;
      } else {
        debugLogger.error('CACHE', 'MEDIA_DOWNLOAD_FAILED', `Failed to download media: ${url}`, { status: downloadResult.status });
        return null;
      }
    } catch (error) {
      debugLogger.error('CACHE', 'MEDIA_CACHE_ERROR', `Failed to cache media: ${url}`, error);
      return null;
    }
  }

  async getCachedMediaPath(url: string): Promise<string | null> {
    // On web platform, always return the original URL
    if (Platform.OS === 'web') {
      return url;
    }

    const cached = this.mediaCache.get(url);
    if (!cached) return null;

    const fileExists = await FileSystem.getInfoAsync(cached.localPath);
    if (fileExists.exists) {
      cached.lastAccessed = Date.now();
      return cached.localPath;
    } else {
      this.mediaCache.delete(url);
      return null;
    }
  }

  // =====================================================
  // HELPER METHODS FOR SPECIFIC DATA TYPES
  // =====================================================

  // Posts
  async cachePosts(posts: Post[], keyPrefix = 'feed'): Promise<void> {
    for (const post of posts) {
      await this.set('posts', `${keyPrefix}:${post.id}`, post);
    }
  }

  async getCachedPosts(keyPrefix = 'feed', limit = 20): Promise<Post[]> {
    const posts: Post[] = [];
    let index = 0;
    
    while (posts.length < limit && index < 100) { // Prevent infinite loop
      const post = await this.get<Post>('posts', `${keyPrefix}:${index}`);
      if (post) {
        posts.push(post);
      }
      index++;
    }
    
    return posts;
  }

  // Reels
  async cacheReels(reels: Reel[], keyPrefix = 'feed'): Promise<void> {
    for (let i = 0; i < reels.length; i++) {
      await this.set('reels', `${keyPrefix}:${i}`, reels[i]);
    }
  }

  async getCachedReels(keyPrefix = 'feed', limit = 20): Promise<Reel[]> {
    const reels: Reel[] = [];
    
    for (let i = 0; i < limit; i++) {
      const reel = await this.get<Reel>('reels', `${keyPrefix}:${i}`);
      if (reel) {
        reels.push(reel);
      }
    }
    
    return reels;
  }

  // Users
  async cacheUser(user: User): Promise<void> {
    await this.set('users', user.id, user);
  }

  async getCachedUser(userId: string): Promise<User | null> {
    return await this.get<User>('users', userId);
  }

  // Stories
  async cacheStories(stories: Story[]): Promise<void> {
    for (let i = 0; i < stories.length; i++) {
      await this.set('stories', `story:${i}`, stories[i]);
    }
  }

  async getCachedStories(limit = 20): Promise<Story[]> {
    const stories: Story[] = [];
    
    for (let i = 0; i < limit; i++) {
      const story = await this.get<Story>('stories', `story:${i}`);
      if (story) {
        stories.push(story);
      }
    }
    
    return stories;
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async persistItem<T>(key: string, item: CacheItem<T>): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(item));
    } catch (error) {
      debugLogger.error('CACHE', 'PERSIST_ERROR', `Failed to persist cache item: ${key}`, error);
    }
  }

  private async removePersistentItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache:${key}`);
    } catch (error) {
      debugLogger.error('CACHE', 'REMOVE_PERSIST_ERROR', `Failed to remove persistent cache item: ${key}`, error);
    }
  }

  private async persistMediaCache(): Promise<void> {
    try {
      // Skip media cache persistence on web platform
      if (Platform.OS === 'web') {
        return;
      }

      const cacheObject = Object.fromEntries(this.mediaCache);
      await AsyncStorage.setItem('mediaCache', JSON.stringify(cacheObject));
    } catch (error) {
      debugLogger.error('CACHE', 'PERSIST_MEDIA_ERROR', 'Failed to persist media cache', error);
    }
  }

  private async enforceMaxItems(type: keyof typeof CACHE_CONFIGS): Promise<void> {
    const config = CACHE_CONFIGS[type];
    const typePrefix = `${type}:`;
    const items = Array.from(this.memoryCache.entries())
      .filter(([key]) => key.startsWith(typePrefix))
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed); // Sort by last accessed (oldest first)

    if (items.length > config.maxItems) {
      const itemsToRemove = items.slice(0, items.length - config.maxItems);
      
      for (const [key] of itemsToRemove) {
        this.memoryCache.delete(key);
        await this.removePersistentItem(key);
      }
      
      debugLogger.info('CACHE', 'ENFORCE_MAX', `Removed ${itemsToRemove.length} old ${type} cache items`);
    }
  }

  private async enforceMediaCacheSize(): Promise<void> {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const maxItems = 100;
    
    let totalSize = Array.from(this.mediaCache.values()).reduce((sum, item) => sum + (item.size || 0), 0);
    
    if (this.mediaCache.size <= maxItems && totalSize <= maxSize) return;
    
    // Sort by last accessed (oldest first)
    const sortedItems = Array.from(this.mediaCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let removedCount = 0;
    
    for (const [url, item] of sortedItems) {
      if (this.mediaCache.size <= maxItems && totalSize <= maxSize) break;
      
      try {
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
        this.mediaCache.delete(url);
        totalSize -= item.size;
        removedCount++;
      } catch (error) {
        debugLogger.error('CACHE', 'MEDIA_DELETE_ERROR', `Failed to delete cached media: ${item.localPath}`, error);
      }
    }
    
    if (removedCount > 0) {
      await this.persistMediaCache();
      debugLogger.info('CACHE', 'MEDIA_CLEANUP', `Removed ${removedCount} cached media files`);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      let removedCount = 0;
      
      // Clean memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        const [type] = key.split(':') as [keyof typeof CACHE_CONFIGS];
        const config = CACHE_CONFIGS[type];
        
        if (config && now - item.timestamp > config.ttl) {
          this.memoryCache.delete(key);
          await this.removePersistentItem(key);
          removedCount++;
        }
      }
      
      // Clean media cache
      for (const [url, item] of this.mediaCache.entries()) {
        if (now - item.timestamp > CACHE_CONFIGS.media.ttl) {
          try {
            await FileSystem.deleteAsync(item.localPath, { idempotent: true });
            this.mediaCache.delete(url);
            removedCount++;
          } catch (error) {
            debugLogger.error('CACHE', 'CLEANUP_MEDIA_ERROR', `Failed to delete expired media: ${item.localPath}`, error);
          }
        }
      }
      
      if (removedCount > 0) {
        await this.persistMediaCache();
        debugLogger.info('CACHE', 'CLEANUP_SUCCESS', `Cleaned up ${removedCount} expired cache items`);
      }
    } catch (error) {
      debugLogger.error('CACHE', 'CLEANUP_ERROR', 'Failed to cleanup cache', error);
    }
  }

  // =====================================================
  // CACHE STATISTICS
  // =====================================================

  async getStats() {
    const memoryStats = {
      totalItems: this.memoryCache.size,
      totalSize: Array.from(this.memoryCache.values()).reduce((total, item) => {
        return total + JSON.stringify(item).length;
      }, 0),
      byType: this.getMemoryCacheStatsByType(),
    };

    const mediaStats = {
      totalItems: this.mediaCache.size,
      totalSize: Array.from(this.mediaCache.values()).reduce((total, item) => {
        return total + (item.size || 0);
      }, 0),
      oldestItem: this.getOldestMediaCacheItem(),
      newestItem: this.getNewestMediaCacheItem(),
    };

    // Get persistent cache size (approximate)
    let persistentSize = 0;
    let persistentKeys: string[] = [];
    try {
      const keys = await AsyncStorage.getAllKeys();
      persistentKeys = keys.filter(key => key.startsWith('cache:'));
      
      for (const key of persistentKeys.slice(0, 10)) { // Sample first 10 items
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            persistentSize += value.length;
          }
        } catch (error) {
          // Skip failed items
        }
      }
      
      // Estimate total size based on sample
      persistentSize = persistentSize * (persistentKeys.length / Math.min(persistentKeys.length, 10));
    } catch (error) {
      debugLogger.error('CACHE', 'STATS_ERROR', 'Failed to calculate persistent cache size', error);
    }

    const stats = {
      platform: Platform.OS,
      memoryCache: memoryStats,
      mediaCache: mediaStats,
      persistent: {
        totalSize: persistentSize,
        keyCount: persistentKeys.length,
        sampleKeys: persistentKeys.slice(0, 5),
      },
      isWebPlatform: Platform.OS === 'web',
      mediaCacheDisabled: Platform.OS === 'web',
    };

    // Enhanced logging for debugging
    debugLogger.info('CACHE', 'STATS_GENERATED', 'Cache statistics generated', {
      memoryItems: stats.memoryCache.totalItems,
      mediaItems: stats.mediaCache.totalItems,
      persistentKeys: stats.persistent.keyCount,
      platform: stats.platform,
    });

    return stats;
  }

  private getMemoryCacheStatsByType(): Record<string, number> {
    const typeStats: Record<string, number> = {};
    
    for (const [key] of this.memoryCache) {
      const type = key.split(':')[0];
      typeStats[type] = (typeStats[type] || 0) + 1;
    }
    
    return typeStats;
  }

  private getOldestMediaCacheItem(): { url: string; age: number } | null {
    if (this.mediaCache.size === 0) return null;
    
    let oldest: { url: string; age: number } | null = null;
    const now = Date.now();
    
    for (const [url, item] of this.mediaCache) {
      const age = now - item.timestamp;
      if (!oldest || age > oldest.age) {
        oldest = { url, age };
      }
    }
    
    return oldest;
  }

  private getNewestMediaCacheItem(): { url: string; age: number } | null {
    if (this.mediaCache.size === 0) return null;
    
    let newest: { url: string; age: number } | null = null;
    const now = Date.now();
    
    for (const [url, item] of this.mediaCache) {
      const age = now - item.timestamp;
      if (!newest || age < newest.age) {
        newest = { url, age };
      }
    }
    
    return newest;
  }

  // Debug method to get detailed cache contents
  async getDetailedCacheInfo(): Promise<any> {
    const info = {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys()).slice(0, 10), // First 10 keys
        sampleContent: {} as Record<string, any>,
      },
      mediaCache: {
        size: this.mediaCache.size,
        items: Array.from(this.mediaCache.entries()).slice(0, 5).map(([url, item]) => ({
          url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
          size: item.size,
          timestamp: new Date(item.timestamp).toISOString(),
          lastAccessed: new Date(item.lastAccessed).toISOString(),
        })),
      },
      platform: Platform.OS,
      webCachingDisabled: Platform.OS === 'web',
    };

    // Get sample content from memory cache
    let sampleCount = 0;
    for (const [key, value] of this.memoryCache) {
      if (sampleCount >= 3) break;
      info.memoryCache.sampleContent[key] = typeof value === 'object' ? 
        Object.keys(value).length + ' properties' : 
        typeof value;
      sampleCount++;
    }

    return info;
  }

  // Method to test cache operations
  async testCacheOperations(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    let allSuccess = true;

    try {
      debugLogger.info('CACHE', 'TEST_START', 'Starting cache operation tests');

      // Test 1: Memory cache set/get
      const testKey = 'cache-test-' + Date.now();
      const testValue = { test: true, timestamp: Date.now() };
      
      await this.set('posts', testKey, testValue);
      results.push({ test: 'Memory Cache SET', success: true });
      
      const retrieved = await this.get('posts', testKey);
      const getSuccess = retrieved && (retrieved as any).test === true;
      results.push({ test: 'Memory Cache GET', success: getSuccess, data: retrieved });
      
      if (getSuccess) {
        await this.removePersistentItem(`posts:${testKey}`);
        results.push({ test: 'Memory Cache REMOVE', success: true });
      }

      // Test 2: Media cache (mobile only)
      if (Platform.OS !== 'web') {
        const testUrl = 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=50';
        
        debugLogger.info('CACHE', 'TEST_MEDIA_START', 'Testing media cache with small image');
        const cachedPath = await this.cacheMedia(testUrl, 'thumbnail');
        
        const mediaCacheSuccess = cachedPath !== null;
        results.push({ 
          test: 'Media Cache', 
          success: mediaCacheSuccess, 
          path: cachedPath,
          originalUrl: testUrl 
        });
        
        if (!mediaCacheSuccess) allSuccess = false;
      } else {
        results.push({ 
          test: 'Media Cache', 
          success: true, 
          note: 'Skipped on web platform (expected behavior)' 
        });
      }

      // Test 3: Stats generation
      const stats = await this.getStats();
      const statsSuccess = stats && typeof stats.memoryCache === 'object';
      results.push({ test: 'Cache Stats', success: statsSuccess, stats });
      
      if (!statsSuccess) allSuccess = false;

      debugLogger.info('CACHE', 'TEST_COMPLETE', 'Cache operation tests completed', { success: allSuccess });

    } catch (error) {
      allSuccess = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ test: 'Cache Test Suite', success: false, error: errorMessage });
      debugLogger.error('CACHE', 'TEST_ERROR', 'Cache test suite failed', error);
    }

    return { success: allSuccess, results };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// =====================================================
// CACHE HOOKS FOR REACT COMPONENTS
// =====================================================

import { useEffect, useState } from 'react';

export function useCachedData<T>(
  type: keyof typeof CACHE_CONFIGS,
  key: string,
  fetchFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get from cache first
        const cached = await cacheService.get<T>(type, key);
        if (cached && isMounted) {
          setData(cached);
          setLoading(false);
          return;
        }

        // Fetch fresh data
        const freshData = await fetchFunction();
        if (isMounted) {
          setData(freshData);
          await cacheService.set(type, key, freshData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, loading, error };
}

// Helper hook for media caching
export function useCachedMedia(url: string | null, type: 'image' | 'video' | 'thumbnail' = 'image') {
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setLocalPath(null);
      return;
    }

    // On web platform, immediately return the original URL
    if (Platform.OS === 'web') {
      setLocalPath(url);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadMedia = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if already cached
        const cached = await cacheService.getCachedMediaPath(url);
        if (cached && isMounted) {
          setLocalPath(cached);
          setLoading(false);
          return;
        }

        // Cache the media
        const cachedPath = await cacheService.cacheMedia(url, type);
        if (isMounted) {
          setLocalPath(cachedPath);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
    };
  }, [url, type]);

  // On web platform, always return the original URL to avoid local file path issues
  const finalPath = Platform.OS === 'web' ? url : (localPath || url);
  return { localPath: finalPath, loading, error };
}
