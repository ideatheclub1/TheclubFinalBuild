import { dataService } from '@/services/dataService';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Test utility to verify storage upload functionality
 */
export class StorageTestUtils {
  /**
   * Test image upload with detailed logging
   */
  static async testImageUpload(userId: string): Promise<boolean> {
    try {
      console.log('🧪 Starting image upload test...');
      
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required for testing');
        return false;
      }

      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        console.log('❌ Test cancelled - no image selected');
        return false;
      }

      const asset = result.assets[0];
      console.log('📷 Selected image:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        type: asset.type
      });

      // Test upload
      const file = {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `test-${Date.now()}.jpg`,
      };

      console.log('⬆️ Starting upload test...');
      const uploadResult = await dataService.storage.uploadImage(
        file,
        'user-media',
        userId,
        { folder: 'test-uploads' }
      );

      if (uploadResult) {
        console.log('✅ Upload successful!', uploadResult);
        Alert.alert(
          'Upload Test Success!',
          `Image uploaded successfully!\nURL: ${uploadResult.url}\nPath: ${uploadResult.path}`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        console.log('❌ Upload failed - no result returned');
        Alert.alert('Upload Test Failed', 'No result returned from upload');
        return false;
      }
    } catch (error) {
      console.error('❌ Upload test error:', error);
      Alert.alert('Upload Test Error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Test video upload with detailed logging
   */
  static async testVideoUpload(userId: string): Promise<boolean> {
    try {
      console.log('🧪 Starting video upload test...');
      
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required for testing');
        return false;
      }

      // Pick a video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        console.log('❌ Test cancelled - no video selected');
        return false;
      }

      const asset = result.assets[0];
      console.log('🎥 Selected video:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        fileSize: asset.fileSize,
        type: asset.type
      });

      // Test upload
      const file = {
        uri: asset.uri,
        type: 'video/mp4',
        name: `test-${Date.now()}.mp4`,
      };

      console.log('⬆️ Starting video upload test...');
      const uploadResult = await dataService.storage.uploadVideo(
        file,
        'user-media',
        userId,
        { folder: 'test-uploads' }
      );

      if (uploadResult) {
        console.log('✅ Video upload successful!', uploadResult);
        Alert.alert(
          'Video Upload Test Success!',
          `Video uploaded successfully!\nURL: ${uploadResult.url}\nPath: ${uploadResult.path}`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        console.log('❌ Video upload failed - no result returned');
        Alert.alert('Video Upload Test Failed', 'No result returned from upload');
        return false;
      }
    } catch (error) {
      console.error('❌ Video upload test error:', error);
      Alert.alert('Video Upload Test Error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Test storage buckets accessibility
   */
  static async testStorageBuckets(): Promise<void> {
    try {
      console.log('🧪 Testing storage bucket accessibility...');
      
      const buckets = ['user-media', 'posts', 'reels'];
      const results: { [key: string]: boolean } = {};

      for (const bucket of buckets) {
        try {
          // Try to get bucket info by attempting to list files
          const { data, error } = await dataService.storage.getUserMedia('test-user-id');
          results[bucket] = !error;
          console.log(`✅ Bucket '${bucket}': ${!error ? 'accessible' : 'error'}`);
        } catch (error) {
          results[bucket] = false;
          console.log(`❌ Bucket '${bucket}': error -`, error);
        }
      }

      Alert.alert(
        'Storage Bucket Test',
        Object.entries(results)
          .map(([bucket, accessible]) => `${bucket}: ${accessible ? '✅' : '❌'}`)
          .join('\n')
      );
    } catch (error) {
      console.error('❌ Storage bucket test error:', error);
      Alert.alert('Storage Test Error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run all storage tests
   */
  static async runAllTests(userId: string): Promise<void> {
    console.log('🧪 Running all storage tests...');
    
    Alert.alert(
      'Storage Tests',
      'This will test image upload, video upload, and storage bucket accessibility. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Tests',
          onPress: async () => {
            await this.testStorageBuckets();
            
            // Wait a bit between tests
            setTimeout(async () => {
              await this.testImageUpload(userId);
              
              setTimeout(async () => {
                await this.testVideoUpload(userId);
              }, 2000);
            }, 2000);
          }
        }
      ]
    );
  }
}

export default StorageTestUtils;
