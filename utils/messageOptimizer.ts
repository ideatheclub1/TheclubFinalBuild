import { Message, Conversation } from '@/types';

/**
 * Message Performance Optimization Utilities
 * These utilities help optimize message handling and rendering performance
 */

interface MessageGroup {
  senderId: string;
  messages: Message[];
  timestamp: string;
}

interface ConversationCache {
  [conversationId: string]: {
    messages: Message[];
    lastUpdated: number;
    participants: string[];
  };
}

export class MessageOptimizer {
  private static messageCache: ConversationCache = {};
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHED_CONVERSATIONS = 10;

  /**
   * Group consecutive messages from the same sender
   * This helps reduce avatar renders and optimize UI performance
   */
  static groupMessages(messages: Message[]): MessageGroup[] {
    if (!messages || messages.length === 0) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    for (const message of messages) {
      if (!currentGroup || currentGroup.senderId !== message.senderId) {
        // Start a new group
        currentGroup = {
          senderId: message.senderId,
          messages: [message],
          timestamp: message.timestamp,
        };
        groups.push(currentGroup);
      } else {
        // Add to existing group
        currentGroup.messages.push(message);
      }
    }

    return groups;
  }

  /**
   * Determine if a message should show the sender avatar
   * Only show on the last message of a group
   */
  static shouldShowAvatar(messages: Message[], currentIndex: number): boolean {
    if (currentIndex >= messages.length - 1) return true;
    
    const currentMessage = messages[currentIndex];
    const nextMessage = messages[currentIndex + 1];
    
    return currentMessage.senderId !== nextMessage.senderId;
  }

  /**
   * Determine if a message should show a timestamp
   * Show timestamp on first message of a group or after time gap
   */
  static shouldShowTimestamp(messages: Message[], currentIndex: number): boolean {
    if (currentIndex === 0) return true;
    
    const currentMessage = messages[currentIndex];
    const previousMessage = messages[currentIndex - 1];
    
    // Different sender
    if (currentMessage.senderId !== previousMessage.senderId) return true;
    
    // Time gap of more than 5 minutes
    const currentTime = new Date(currentMessage.timestamp).getTime();
    const previousTime = new Date(previousMessage.timestamp).getTime();
    const timeDiff = currentTime - previousTime;
    
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Cache messages for a conversation to reduce API calls
   */
  static cacheMessages(conversationId: string, messages: Message[], participants: string[] = []): void {
    // Remove old cache entries if we have too many
    const cacheKeys = Object.keys(this.messageCache);
    if (cacheKeys.length >= this.MAX_CACHED_CONVERSATIONS) {
      // Remove the oldest entry
      const oldestKey = cacheKeys.reduce((oldest, key) => {
        return this.messageCache[key].lastUpdated < this.messageCache[oldest].lastUpdated ? key : oldest;
      });
      delete this.messageCache[oldestKey];
    }

    this.messageCache[conversationId] = {
      messages: [...messages],
      lastUpdated: Date.now(),
      participants,
    };
  }

  /**
   * Get cached messages if still valid
   */
  static getCachedMessages(conversationId: string): Message[] | null {
    const cached = this.messageCache[conversationId];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.lastUpdated > this.CACHE_DURATION) {
      delete this.messageCache[conversationId];
      return null;
    }

    return [...cached.messages];
  }

  /**
   * Add a new message to the cache
   */
  static addMessageToCache(conversationId: string, message: Message): void {
    const cached = this.messageCache[conversationId];
    if (!cached) return;

    cached.messages.push(message);
    cached.lastUpdated = Date.now();
  }

  /**
   * Remove a message from the cache
   */
  static removeMessageFromCache(conversationId: string, messageId: string): void {
    const cached = this.messageCache[conversationId];
    if (!cached) return;

    cached.messages = cached.messages.filter(msg => msg.id !== messageId);
    cached.lastUpdated = Date.now();
  }

  /**
   * Update message read status in cache
   */
  static updateMessageReadStatusInCache(conversationId: string, messageId: string, isRead: boolean): void {
    const cached = this.messageCache[conversationId];
    if (!cached) return;

    const message = cached.messages.find(msg => msg.id === messageId);
    if (message) {
      message.isRead = isRead;
      cached.lastUpdated = Date.now();
    }
  }

  /**
   * Clear all message cache
   */
  static clearCache(): void {
    this.messageCache = {};
  }

  /**
   * Clear cache for a specific conversation
   */
  static clearConversationCache(conversationId: string): void {
    delete this.messageCache[conversationId];
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): {
    totalConversations: number;
    totalMessages: number;
    cacheSize: number;
    oldestCache: number;
    newestCache: number;
  } {
    const conversations = Object.keys(this.messageCache);
    const totalMessages = conversations.reduce((total, key) => {
      return total + this.messageCache[key].messages.length;
    }, 0);

    const timestamps = conversations.map(key => this.messageCache[key].lastUpdated);
    const oldestCache = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestCache = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      totalConversations: conversations.length,
      totalMessages,
      cacheSize: JSON.stringify(this.messageCache).length,
      oldestCache,
      newestCache,
    };
  }

  /**
   * Optimize conversation list by sorting and limiting
   */
  static optimizeConversationList(
    conversations: Conversation[], 
    limit: number = 50
  ): Conversation[] {
    return conversations
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime; // Most recent first
      })
      .slice(0, limit);
  }

  /**
   * Debounce typing indicator to reduce network calls
   */
  static createTypingDebouncer(callback: () => void, delay: number = 1000): () => void {
    let timeoutId: NodeJS.Timeout;
    
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, delay);
    };
  }

  /**
   * Throttle message sending to prevent spam
   */
  static createMessageThrottle(callback: (message: string) => Promise<void>, delay: number = 500): (message: string) => void {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout;
    
    return (message: string) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        callback(message);
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          callback(message);
        }, delay - (now - lastCall));
      }
    };
  }

  /**
   * Compress image before sending
   */
  static async compressImage(uri: string, quality: number = 0.8): Promise<string> {
    // This would integrate with expo-image-manipulator
    // For now, return the original URI
    // TODO: Implement actual image compression
    return uri;
  }

  /**
   * Calculate estimated message size for bandwidth optimization
   */
  static calculateMessageSize(message: Message): number {
    const baseSize = JSON.stringify(message).length;
    
    // Add estimated media size if applicable
    if (message.content.includes('Sent a image')) {
      return baseSize + 500000; // ~500KB estimate for image
    } else if (message.content.includes('Sent a video')) {
      return baseSize + 2000000; // ~2MB estimate for video
    } else if (message.content.includes('Sent a document')) {
      return baseSize + 100000; // ~100KB estimate for document
    }
    
    return baseSize;
  }

  /**
   * Batch message operations for better performance
   */
  static batchMessageOperations<T>(
    operations: (() => Promise<T>)[], 
    batchSize: number = 5
  ): Promise<T[]> {
    const batches: (() => Promise<T>)[][] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    
    return batches.reduce(async (previousBatch, currentBatch) => {
      const results = await previousBatch;
      const currentResults = await Promise.all(currentBatch.map(op => op()));
      return [...results, ...currentResults];
    }, Promise.resolve([] as T[]));
  }
}

// Export utility functions for easier use
export const messageUtils = {
  groupMessages: MessageOptimizer.groupMessages.bind(MessageOptimizer),
  shouldShowAvatar: MessageOptimizer.shouldShowAvatar.bind(MessageOptimizer),
  shouldShowTimestamp: MessageOptimizer.shouldShowTimestamp.bind(MessageOptimizer),
  cacheMessages: MessageOptimizer.cacheMessages.bind(MessageOptimizer),
  getCachedMessages: MessageOptimizer.getCachedMessages.bind(MessageOptimizer),
  createTypingDebouncer: MessageOptimizer.createTypingDebouncer.bind(MessageOptimizer),
  createMessageThrottle: MessageOptimizer.createMessageThrottle.bind(MessageOptimizer),
};