// =====================================================
// CLIENT-SIDE STORY CLEANUP UTILITIES
// =====================================================
// Handles automatic cleanup of expired stories on the client side
// Works with both Supabase Free and Pro tiers

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from '../types';

const CLEANUP_STORAGE_KEY = '@story_cleanup_last_run';
const CLEANUP_INTERVAL_HOURS = 1; // Run cleanup every hour

interface CleanupResult {
  removedCount: number;
  totalStories: number;
  timestamp: string;
  nextCleanupAt: string;
}

/**
 * Removes expired stories from a stories array
 * @param stories Array of stories to clean
 * @returns Object with cleaned stories and cleanup stats
 */
export function removeExpiredStories(stories: Story[]): {
  cleanStories: Story[];
  expiredStories: Story[];
  stats: CleanupResult;
} {
  const now = new Date();
  const cleanStories: Story[] = [];
  const expiredStories: Story[] = [];

  stories.forEach(story => {
    if (story.expiresAt) {
      const expiresAt = new Date(story.expiresAt);
      if (expiresAt > now) {
        cleanStories.push(story);
      } else {
        expiredStories.push(story);
      }
    } else {
      // If no expiry date, assume it's expired (shouldn't happen with new stories)
      const createdAt = story.createdAt ? new Date(story.createdAt) : new Date(story.timestamp || 0);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      if (createdAt > twentyFourHoursAgo) {
        cleanStories.push(story);
      } else {
        expiredStories.push(story);
      }
    }
  });

  const stats: CleanupResult = {
    removedCount: expiredStories.length,
    totalStories: stories.length,
    timestamp: now.toISOString(),
    nextCleanupAt: new Date(now.getTime() + CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000).toISOString(),
  };

  return { cleanStories, expiredStories, stats };
}

/**
 * Checks if cleanup should run based on last cleanup time
 * @returns Promise<boolean> True if cleanup should run
 */
export async function shouldRunCleanup(): Promise<boolean> {
  try {
    const lastCleanup = await AsyncStorage.getItem(CLEANUP_STORAGE_KEY);
    if (!lastCleanup) return true;

    const lastCleanupTime = new Date(lastCleanup);
    const now = new Date();
    const hoursSinceLastCleanup = (now.getTime() - lastCleanupTime.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastCleanup >= CLEANUP_INTERVAL_HOURS;
  } catch (error) {
    console.error('Error checking cleanup schedule:', error);
    return true; // Run cleanup if there's an error
  }
}

/**
 * Updates the last cleanup timestamp
 */
export async function updateLastCleanupTime(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLEANUP_STORAGE_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error updating cleanup timestamp:', error);
  }
}

/**
 * Auto-cleanup function that can be called periodically
 * @param stories Current stories array
 * @param onCleanup Callback function to update stories after cleanup
 * @returns Promise<CleanupResult | null> Cleanup stats or null if no cleanup needed
 */
export async function autoCleanupStories(
  stories: Story[],
  onCleanup: (cleanStories: Story[]) => void
): Promise<CleanupResult | null> {
  const shouldCleanup = await shouldRunCleanup();
  
  if (!shouldCleanup) {
    return null;
  }

  console.log('🧹 Running automatic story cleanup...');
  
  const { cleanStories, expiredStories, stats } = removeExpiredStories(stories);
  
  if (expiredStories.length > 0) {
    console.log(`🗑️ Removed ${expiredStories.length} expired stories`);
    onCleanup(cleanStories);
  }

  await updateLastCleanupTime();
  
  return stats;
}

/**
 * Hook-like function for automatic story cleanup in React components
 */
export class StoryCleanupManager {
  private stories: Story[] = [];
  private onUpdate: (stories: Story[]) => void = () => {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(stories: Story[], onUpdate: (stories: Story[]) => void) {
    this.stories = stories;
    this.onUpdate = onUpdate;
  }

  /**
   * Start automatic cleanup with specified interval
   * @param intervalMinutes Interval in minutes (default: 60)
   */
  startAutoCleanup(intervalMinutes: number = 60): void {
    this.stopAutoCleanup(); // Clear any existing interval

    // Run initial cleanup
    this.runCleanup();

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);

    console.log(`📅 Story auto-cleanup started (every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Story auto-cleanup stopped');
    }
  }

  /**
   * Update stories and run cleanup if needed
   */
  updateStories(newStories: Story[]): void {
    this.stories = newStories;
    // Run cleanup on story updates
    setTimeout(() => this.runCleanup(), 1000);
  }

  /**
   * Manual cleanup trigger
   */
  async runCleanup(): Promise<CleanupResult | null> {
    return await autoCleanupStories(this.stories, this.onUpdate);
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): { expired: number; active: number; total: number } {
    const { cleanStories, expiredStories } = removeExpiredStories(this.stories);
    return {
      expired: expiredStories.length,
      active: cleanStories.length,
      total: this.stories.length,
    };
  }

  /**
   * Cleanup when component unmounts
   */
  destroy(): void {
    this.stopAutoCleanup();
  }
}

/**
 * Utility function to check if a story is expired
 * @param story Story to check
 * @returns boolean True if story is expired
 */
export function isStoryExpired(story: Story): boolean {
  const now = new Date();
  
  if (story.expiresAt) {
    return new Date(story.expiresAt) <= now;
  }
  
  // Fallback: check if story is older than 24 hours
  const createdAt = story.createdAt ? new Date(story.createdAt) : new Date(story.timestamp || 0);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return createdAt <= twentyFourHoursAgo;
}

/**
 * Get time remaining for a story
 * @param story Story to check
 * @returns string Human-readable time remaining or "Expired"
 */
export function getStoryTimeRemaining(story: Story): string {
  if (isStoryExpired(story)) {
    return 'Expired';
  }

  const now = new Date();
  const expiresAt = story.expiresAt 
    ? new Date(story.expiresAt)
    : new Date((story.createdAt ? new Date(story.createdAt) : new Date(story.timestamp || 0)).getTime() + 24 * 60 * 60 * 1000);

  const msRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursRemaining > 0) {
    return `${hoursRemaining}h ${minutesRemaining}m`;
  } else if (minutesRemaining > 0) {
    return `${minutesRemaining}m`;
  } else {
    return 'Less than 1m';
  }
}

/**
 * Create story expiry date (24 hours from now)
 * @returns string ISO date string
 */
export function createStoryExpiry(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Debug function to log story cleanup information
 */
export function debugStoryCleanup(stories: Story[]): void {
  const stats = stories.reduce(
    (acc, story) => {
      if (isStoryExpired(story)) {
        acc.expired++;
      } else {
        acc.active++;
      }
      acc.total++;
      return acc;
    },
    { expired: 0, active: 0, total: 0 }
  );

  console.log('📊 Story Cleanup Debug Info:');
  console.log(`   Total stories: ${stats.total}`);
  console.log(`   Active stories: ${stats.active}`);
  console.log(`   Expired stories: ${stats.expired}`);
  
  if (stats.expired > 0) {
    console.log('⚠️ Expired stories found - cleanup recommended');
  }
}

export default {
  removeExpiredStories,
  shouldRunCleanup,
  updateLastCleanupTime,
  autoCleanupStories,
  StoryCleanupManager,
  isStoryExpired,
  getStoryTimeRemaining,
  createStoryExpiry,
  debugStoryCleanup,
};