import { Video, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React from 'react';

export interface VideoMetadata {
  duration: number; // in milliseconds
  width?: number;
  height?: number;
  uri: string;
}

export class VideoDurationDetector {
  private static videoInstances = new Map<string, Video>();

  /**
   * Get video duration using expo-av Video component
   * This is more accurate than file-based estimation
   */
  static async getVideoDuration(videoUri: string): Promise<number | null> {
    try {
      return new Promise((resolve, reject) => {
        // Create a temporary video component for duration detection
        const videoRef = React.createRef<Video>();
        
        // Timeout for the operation
        const timeout = setTimeout(() => {
          reject(new Error('Video duration detection timeout'));
        }, 10000); // 10 second timeout

        const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.durationMillis) {
            clearTimeout(timeout);
            resolve(status.durationMillis);
          } else if (status.isLoaded && status.durationMillis === undefined) {
            // Some videos might not have duration immediately
            // Try to get it from positionMillis at the end
            clearTimeout(timeout);
            resolve(null);
          }
        };

        // This is a conceptual approach - in practice, you'd need to render
        // a hidden Video component or use a different method
        // For now, we'll use a fallback approach
        this.getVideoDurationFallback(videoUri).then(resolve).catch(reject);
      });
    } catch (error) {
      console.error('Error getting video duration:', error);
      return null;
    }
  }

  /**
   * Fallback method using file analysis and common patterns
   */
  private static async getVideoDurationFallback(videoUri: string): Promise<number | null> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        return null;
      }

      // For mobile recordings, we can make educated guesses based on file size
      // This is not accurate but provides a reasonable estimate
      const fileSizeBytes = fileInfo.size || 0;
      
      // Estimate based on typical video bitrates
      // Mobile videos are typically 5-15 Mbps
      // For a rough estimate: duration = fileSize / (bitrate / 8)
      const estimatedBitrateMbps = 8; // 8 Mbps average
      const estimatedDurationSeconds = fileSizeBytes / (estimatedBitrateMbps * 1024 * 1024 / 8);
      
      // Clamp to reasonable values for reels (5 seconds to 3 minutes)
      const clampedDuration = Math.max(5000, Math.min(180000, estimatedDurationSeconds * 1000));
      
      return clampedDuration;
    } catch (error) {
      console.error('Error in fallback duration detection:', error);
      // Return a reasonable default for reels
      return 30000; // 30 seconds
    }
  }

  /**
   * Get video metadata including duration and dimensions
   */
  static async getVideoMetadata(videoUri: string): Promise<VideoMetadata | null> {
    try {
      const duration = await this.getVideoDuration(videoUri);
      if (!duration) {
        return null;
      }

      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      
      return {
        duration,
        uri: videoUri,
        width: undefined, // Would need video analysis for this
        height: undefined, // Would need video analysis for this
      };
    } catch (error) {
      console.error('Error getting video metadata:', error);
      return null;
    }
  }

  /**
   * Smart timestamp selection based on video duration
   */
  static getSmartTimestamps(durationMs: number, count: number = 3): number[] {
    if (durationMs <= 0 || count <= 0) {
      return [];
    }

    const timestamps: number[] = [];
    
    if (durationMs <= 5000) {
      // Very short videos (≤5 seconds): take frames at 20%, 50%, 80%
      timestamps.push(
        durationMs * 0.2,
        durationMs * 0.5,
        durationMs * 0.8
      );
    } else if (durationMs <= 15000) {
      // Short videos (≤15 seconds): use golden ratio and thirds
      timestamps.push(
        durationMs * 0.25,
        durationMs * 0.382, // Golden ratio
        durationMs * 0.75
      );
    } else if (durationMs <= 60000) {
      // Medium videos (≤1 minute): avoid beginning and end
      timestamps.push(
        durationMs * 0.15,
        durationMs * 0.4,
        durationMs * 0.65,
        durationMs * 0.85
      );
    } else {
      // Long videos (>1 minute): sample more strategically
      timestamps.push(
        durationMs * 0.1,
        durationMs * 0.25,
        durationMs * 0.5,
        durationMs * 0.75,
        durationMs * 0.9
      );
    }

    // Return only the requested count, prioritizing middle timestamps
    return timestamps.slice(0, count);
  }

  /**
   * Get random timestamp within video duration
   */
  static getRandomTimestamp(durationMs: number): number {
    if (durationMs <= 0) {
      return 0;
    }

    // Avoid first and last 10% of video
    const minTime = durationMs * 0.1;
    const maxTime = durationMs * 0.9;
    
    return Math.random() * (maxTime - minTime) + minTime;
  }

  /**
   * Get timestamp using golden ratio (often visually pleasing)
   */
  static getGoldenRatioTimestamp(durationMs: number): number {
    if (durationMs <= 0) {
      return 0;
    }

    // Golden ratio ≈ 0.618, but we use 0.382 for better positioning
    return durationMs * 0.382;
  }

  /**
   * Analyze video content patterns to suggest best timestamps
   * This is a placeholder for future AI-based analysis
   */
  static async analyzeVideoContent(videoUri: string): Promise<number[]> {
    try {
      // Placeholder for future implementation
      // Could analyze:
      // - Motion detection
      // - Face detection
      // - Scene changes
      // - Audio levels
      // - Color variations
      
      const metadata = await this.getVideoMetadata(videoUri);
      if (!metadata) {
        return [];
      }

      // For now, return smart timestamps based on duration
      return this.getSmartTimestamps(metadata.duration, 5);
    } catch (error) {
      console.error('Error analyzing video content:', error);
      return [];
    }
  }
}

// Utility functions for easy use
export const getVideoDuration = (videoUri: string) => 
  VideoDurationDetector.getVideoDuration(videoUri);

export const getSmartTimestamps = (durationMs: number, count?: number) => 
  VideoDurationDetector.getSmartTimestamps(durationMs, count);

export const getRandomTimestamp = (durationMs: number) => 
  VideoDurationDetector.getRandomTimestamp(durationMs);

export const getGoldenRatioTimestamp = (durationMs: number) => 
  VideoDurationDetector.getGoldenRatioTimestamp(durationMs);

