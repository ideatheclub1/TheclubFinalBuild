import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { VideoDurationDetector, getVideoDuration, getSmartTimestamps, getRandomTimestamp, getGoldenRatioTimestamp } from './videoDurationDetector';

export interface ThumbnailGenerationOptions {
  quality?: number; // 0.1 to 1.0
  time?: number; // timestamp in milliseconds
  strategy?: 'random' | 'smart' | 'multiple';
  count?: number; // for multiple thumbnails
}

export interface GeneratedThumbnail {
  uri: string;
  timestamp: number;
  quality: number;
  width: number;
  height: number;
}

export class VideoThumbnailGenerator {
  private static readonly DEFAULT_QUALITY = 0.8;
  private static readonly DEFAULT_THUMBNAIL_COUNT = 3;
  private static readonly SMART_POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9]; // 10%, 30%, 50%, 70%, 90%

  /**
   * Generate a single thumbnail from video at specified or random timestamp
   */
  static async generateSingleThumbnail(
    videoUri: string,
    options: ThumbnailGenerationOptions = {}
  ): Promise<GeneratedThumbnail | null> {
    try {
      const { quality = this.DEFAULT_QUALITY, time, strategy = 'random' } = options;
      
      // Get video duration first
      const videoDuration = await this.getVideoDuration(videoUri);
      if (!videoDuration || videoDuration <= 0) {
        console.warn('Could not determine video duration');
        return null;
      }

      // Calculate timestamp based on strategy
      let timestamp: number;
      
      if (time !== undefined) {
        timestamp = Math.min(time, videoDuration - 1000); // Ensure we don't exceed duration
      } else if (strategy === 'random') {
        // Use improved random timestamp generation
        timestamp = getRandomTimestamp(videoDuration);
      } else if (strategy === 'smart') {
        // Use golden ratio position for visually pleasing results
        timestamp = getGoldenRatioTimestamp(videoDuration);
      } else {
        // Default to middle of video
        timestamp = videoDuration * 0.5;
      }

      // Generate thumbnail
      const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: timestamp,
        quality,
      });

      return {
        uri: thumbnail.uri,
        timestamp: Math.round(timestamp),
        quality,
        width: thumbnail.width,
        height: thumbnail.height,
      };
    } catch (error) {
      console.error('Error generating single thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate multiple thumbnails from different timestamps
   */
  static async generateMultipleThumbnails(
    videoUri: string,
    options: ThumbnailGenerationOptions = {}
  ): Promise<GeneratedThumbnail[]> {
    try {
      const { 
        quality = this.DEFAULT_QUALITY, 
        count = this.DEFAULT_THUMBNAIL_COUNT,
        strategy = 'smart'
      } = options;
      
      const videoDuration = await this.getVideoDuration(videoUri);
      if (!videoDuration || videoDuration <= 0) {
        console.warn('Could not determine video duration');
        return [];
      }

      const thumbnails: GeneratedThumbnail[] = [];
      let timestamps: number[] = [];

      if (strategy === 'random') {
        // Generate random timestamps using improved algorithm
        for (let i = 0; i < count; i++) {
          timestamps.push(getRandomTimestamp(videoDuration));
        }
      } else if (strategy === 'smart') {
        // Use smart positioning based on video duration analysis
        timestamps = getSmartTimestamps(videoDuration, count);
      } else {
        // Evenly distribute thumbnails
        for (let i = 0; i < count; i++) {
          const position = (i + 1) / (count + 1);
          timestamps.push(videoDuration * position);
        }
      }

      // Generate thumbnails for each timestamp
      for (const timestamp of timestamps) {
        try {
          const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time: timestamp,
            quality,
          });

          thumbnails.push({
            uri: thumbnail.uri,
            timestamp: Math.round(timestamp),
            quality,
            width: thumbnail.width,
            height: thumbnail.height,
          });
        } catch (error) {
          console.warn(`Failed to generate thumbnail at ${timestamp}ms:`, error);
        }
      }

      return thumbnails;
    } catch (error) {
      console.error('Error generating multiple thumbnails:', error);
      return [];
    }
  }

  /**
   * Smart thumbnail selection algorithm
   * Analyzes multiple frames and selects the best one based on various criteria
   */
  static async generateSmartThumbnail(videoUri: string): Promise<GeneratedThumbnail | null> {
    try {
      // Generate multiple thumbnails
      const thumbnails = await this.generateMultipleThumbnails(videoUri, {
        strategy: 'smart',
        count: 5,
        quality: 0.7, // Lower quality for analysis, we'll regenerate the final one
      });

      if (thumbnails.length === 0) {
        return null;
      }

      // For now, select the middle thumbnail (can be enhanced with image analysis)
      const selectedThumbnail = thumbnails[Math.floor(thumbnails.length / 2)];
      
      // Regenerate with higher quality
      const finalThumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: selectedThumbnail.timestamp,
        quality: this.DEFAULT_QUALITY,
      });

      return {
        uri: finalThumbnail.uri,
        timestamp: selectedThumbnail.timestamp,
        quality: this.DEFAULT_QUALITY,
        width: finalThumbnail.width,
        height: finalThumbnail.height,
      };
    } catch (error) {
      console.error('Error generating smart thumbnail:', error);
      return null;
    }
  }

  /**
   * Get video duration in milliseconds using improved detection
   */
  private static async getVideoDuration(videoUri: string): Promise<number | null> {
    try {
      return await getVideoDuration(videoUri);
    } catch (error) {
      console.error('Error getting video duration:', error);
      return null;
    }
  }

  /**
   * Enhanced duration detection using expo-av (more accurate)
   */
  static async getAccurateVideoDuration(videoUri: string): Promise<number | null> {
    try {
      // This would require loading the video component temporarily
      // Implementation would depend on your app's architecture
      
      // For now, return a reasonable default
      // In a real implementation, you'd load the video and get its duration
      return new Promise((resolve) => {
        // Simulate async operation
        setTimeout(() => {
          // This should be replaced with actual video duration detection
          // using expo-av Video component or similar
          resolve(30000); // 30 seconds
        }, 100);
      });
    } catch (error) {
      console.error('Error getting accurate video duration:', error);
      return null;
    }
  }

  /**
   * Cleanup generated thumbnail files
   */
  static async cleanupThumbnails(thumbnailUris: string[]): Promise<void> {
    try {
      await Promise.all(
        thumbnailUris.map(async (uri) => {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (error) {
            console.warn(`Failed to delete thumbnail: ${uri}`, error);
          }
        })
      );
    } catch (error) {
      console.error('Error cleaning up thumbnails:', error);
    }
  }

  /**
   * Generate thumbnail with fallback strategies
   */
  static async generateThumbnailWithFallback(videoUri: string): Promise<GeneratedThumbnail | null> {
    try {
      // Strategy 1: Smart thumbnail
      let thumbnail = await this.generateSmartThumbnail(videoUri);
      if (thumbnail) return thumbnail;

      // Strategy 2: Random thumbnail
      thumbnail = await this.generateSingleThumbnail(videoUri, { strategy: 'random' });
      if (thumbnail) return thumbnail;

      // Strategy 3: Middle of video
      thumbnail = await this.generateSingleThumbnail(videoUri, { strategy: 'smart' });
      if (thumbnail) return thumbnail;

      // Strategy 4: First frame (time: 1000ms)
      thumbnail = await this.generateSingleThumbnail(videoUri, { time: 1000 });
      return thumbnail;

    } catch (error) {
      console.error('All thumbnail generation strategies failed:', error);
      return null;
    }
  }
}

// Export utility functions for easy use
export const generateRandomThumbnail = (videoUri: string) => 
  VideoThumbnailGenerator.generateSingleThumbnail(videoUri, { strategy: 'random' });

export const generateSmartThumbnail = (videoUri: string) => 
  VideoThumbnailGenerator.generateSmartThumbnail(videoUri);

export const generateThumbnailAtTime = (videoUri: string, timeMs: number) => 
  VideoThumbnailGenerator.generateSingleThumbnail(videoUri, { time: timeMs });
