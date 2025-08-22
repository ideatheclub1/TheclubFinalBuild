import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { VideoThumbnailGenerator, GeneratedThumbnail } from '../utils/videoThumbnailGenerator';
import { VideoDurationDetector } from '../utils/videoDurationDetector';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThumbnailTestComponentProps {
  onClose?: () => void;
}

export const ThumbnailTestComponent: React.FC<ThumbnailTestComponentProps> = ({ onClose }) => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const selectVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        setSelectedVideo(videoUri);
        setGeneratedThumbnails([]);
        setTestResults([]);
        
        // Get video duration
        const duration = await VideoDurationDetector.getVideoDuration(videoUri);
        setVideoDuration(duration);
        
        addTestResult(`Video selected: ${videoUri.split('/').pop()}`);
        addTestResult(`Duration: ${duration ? (duration / 1000).toFixed(1) : 'unknown'} seconds`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video');
      console.error('Video selection error:', error);
    }
  };

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testRandomThumbnail = async () => {
    if (!selectedVideo) return;
    
    setIsGenerating(true);
    addTestResult('Testing random thumbnail generation...');
    
    try {
      const thumbnail = await VideoThumbnailGenerator.generateSingleThumbnail(selectedVideo, {
        strategy: 'random',
        quality: 0.8,
      });
      
      if (thumbnail) {
        setGeneratedThumbnails(prev => [...prev, thumbnail]);
        addTestResult(`Random thumbnail generated at ${(thumbnail.timestamp / 1000).toFixed(1)}s`);
      } else {
        addTestResult('Failed to generate random thumbnail');
      }
    } catch (error) {
      addTestResult(`Error: ${error}`);
    }
    
    setIsGenerating(false);
  };

  const testSmartThumbnail = async () => {
    if (!selectedVideo) return;
    
    setIsGenerating(true);
    addTestResult('Testing smart thumbnail generation...');
    
    try {
      const thumbnail = await VideoThumbnailGenerator.generateSmartThumbnail(selectedVideo);
      
      if (thumbnail) {
        setGeneratedThumbnails(prev => [...prev, thumbnail]);
        addTestResult(`Smart thumbnail generated at ${(thumbnail.timestamp / 1000).toFixed(1)}s`);
      } else {
        addTestResult('Failed to generate smart thumbnail');
      }
    } catch (error) {
      addTestResult(`Error: ${error}`);
    }
    
    setIsGenerating(false);
  };

  const testMultipleThumbnails = async () => {
    if (!selectedVideo) return;
    
    setIsGenerating(true);
    addTestResult('Testing multiple thumbnail generation...');
    
    try {
      const thumbnails = await VideoThumbnailGenerator.generateMultipleThumbnails(selectedVideo, {
        strategy: 'smart',
        count: 5,
        quality: 0.7,
      });
      
      if (thumbnails.length > 0) {
        setGeneratedThumbnails(prev => [...prev, ...thumbnails]);
        addTestResult(`Generated ${thumbnails.length} thumbnails`);
        thumbnails.forEach((thumb, index) => {
          addTestResult(`  Thumbnail ${index + 1}: ${(thumb.timestamp / 1000).toFixed(1)}s`);
        });
      } else {
        addTestResult('Failed to generate multiple thumbnails');
      }
    } catch (error) {
      addTestResult(`Error: ${error}`);
    }
    
    setIsGenerating(false);
  };

  const testFallbackGeneration = async () => {
    if (!selectedVideo) return;
    
    setIsGenerating(true);
    addTestResult('Testing fallback thumbnail generation...');
    
    try {
      const thumbnail = await VideoThumbnailGenerator.generateThumbnailWithFallback(selectedVideo);
      
      if (thumbnail) {
        setGeneratedThumbnails(prev => [...prev, thumbnail]);
        addTestResult(`Fallback thumbnail generated at ${(thumbnail.timestamp / 1000).toFixed(1)}s`);
      } else {
        addTestResult('All fallback strategies failed');
      }
    } catch (error) {
      addTestResult(`Error: ${error}`);
    }
    
    setIsGenerating(false);
  };

  const clearResults = () => {
    setGeneratedThumbnails([]);
    setTestResults([]);
    setSelectedVideo(null);
    setVideoDuration(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Thumbnail Generation Test</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Video Selection */}
        <View style={styles.section}>
          <TouchableOpacity onPress={selectVideo} style={styles.button}>
            <Text style={styles.buttonText}>Select Video</Text>
          </TouchableOpacity>
          
          {selectedVideo && (
            <View style={styles.videoInfo}>
              <Text style={styles.videoPath}>Video: {selectedVideo.split('/').pop()}</Text>
              {videoDuration && (
                <Text style={styles.videoDuration}>
                  Duration: {(videoDuration / 1000).toFixed(1)} seconds
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Test Buttons */}
        {selectedVideo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Algorithms</Text>
            
            <TouchableOpacity 
              onPress={testRandomThumbnail} 
              style={[styles.button, styles.testButton]}
              disabled={isGenerating}
            >
              <Text style={styles.buttonText}>Test Random Thumbnail</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={testSmartThumbnail} 
              style={[styles.button, styles.testButton]}
              disabled={isGenerating}
            >
              <Text style={styles.buttonText}>Test Smart Thumbnail</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={testMultipleThumbnails} 
              style={[styles.button, styles.testButton]}
              disabled={isGenerating}
            >
              <Text style={styles.buttonText}>Test Multiple Thumbnails</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={testFallbackGeneration} 
              style={[styles.button, styles.testButton]}
              disabled={isGenerating}
            >
              <Text style={styles.buttonText}>Test Fallback Generation</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={clearResults} 
              style={[styles.button, styles.clearButton]}
            >
              <Text style={styles.buttonText}>Clear Results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generated Thumbnails */}
        {generatedThumbnails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Thumbnails</Text>
            <View style={styles.thumbnailGrid}>
              {generatedThumbnails.map((thumbnail, index) => (
                <View key={index} style={styles.thumbnailContainer}>
                  <Image source={{ uri: thumbnail.uri }} style={styles.thumbnail} />
                  <Text style={styles.thumbnailInfo}>
                    {(thumbnail.timestamp / 1000).toFixed(1)}s
                  </Text>
                  <Text style={styles.thumbnailInfo}>
                    {thumbnail.width}x{thumbnail.height}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Test Results Log */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            <View style={styles.logContainer}>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.logText}>
                  {result}
                </Text>
              ))}
            </View>
          </View>
        )}

        {isGenerating && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Generating thumbnail...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2a2a2a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  videoInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  videoPath: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 5,
  },
  videoDuration: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  thumbnailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  thumbnailContainer: {
    width: (SCREEN_WIDTH - 60) / 3,
    marginBottom: 15,
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbnailInfo: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  logContainer: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    maxHeight: 300,
  },
  logText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6C5CE7',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ThumbnailTestComponent;

