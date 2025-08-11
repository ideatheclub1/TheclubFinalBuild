import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, Image as ImageIcon, File, X, Send } from 'lucide-react-native';
import { dataService } from '@/services/dataService';
import { debug, useDebugLogger } from '@/utils/debugLogger';

const { width, height } = Dimensions.get('window');

interface MediaMessageInputProps {
  visible: boolean;
  onClose: () => void;
  onSendMedia: (mediaUrl: string, mediaType: string, caption?: string) => void;
  currentUserId: string;
}

interface MediaItem {
  uri: string;
  type: 'image' | 'video' | 'document';
  name?: string;
  size?: number;
}

export default function MediaMessageInput({ 
  visible, 
  onClose, 
  onSendMedia, 
  currentUserId 
}: MediaMessageInputProps) {
  const debugLogger = useDebugLogger('MediaMessageInput');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          name: asset.fileName || `media_${Date.now()}`,
          size: asset.fileSize,
        });
        
        debugLogger.success('MEDIA', 'MEDIA_SELECTED', `Selected ${asset.type}: ${asset.fileName}`);
      }
    } catch (error) {
      debugLogger.error('MEDIA', 'IMAGE_PICKER_ERROR', 'Failed to pick image', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };

  const handleCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant permission to access your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          name: asset.fileName || `camera_${Date.now()}`,
          size: asset.fileSize,
        });
        
        debugLogger.success('MEDIA', 'CAMERA_CAPTURE', `Captured ${asset.type}`);
      }
    } catch (error) {
      debugLogger.error('MEDIA', 'CAMERA_ERROR', 'Failed to capture media', error);
      Alert.alert('Error', 'Failed to capture media');
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: 'document',
          name: asset.name,
          size: asset.size,
        });
        
        debugLogger.success('MEDIA', 'DOCUMENT_SELECTED', `Selected document: ${asset.name}`);
      }
    } catch (error) {
      debugLogger.error('MEDIA', 'DOCUMENT_PICKER_ERROR', 'Failed to pick document', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleSendMedia = async () => {
    if (!selectedMedia) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      
      debugLogger.process('MEDIA', 'UPLOAD_START', `Uploading ${selectedMedia.type}: ${selectedMedia.name}`);

      // Simulate upload progress (replace with actual upload progress in real implementation)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload media to storage
      const mediaUrl = await dataService.storage.uploadFile(
        selectedMedia.uri,
        'messages',
        currentUserId,
        selectedMedia.name || `media_${Date.now()}`
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (mediaUrl) {
        debugLogger.success('MEDIA', 'UPLOAD_SUCCESS', `Media uploaded successfully: ${mediaUrl}`);
        
        // Send the media message
        onSendMedia(mediaUrl, selectedMedia.type);
        
        // Reset state and close modal
        setSelectedMedia(null);
        setUploading(false);
        setUploadProgress(0);
        onClose();
      } else {
        throw new Error('Failed to upload media');
      }
    } catch (error) {
      debugLogger.error('MEDIA', 'UPLOAD_ERROR', 'Failed to upload media', error);
      Alert.alert('Error', 'Failed to send media. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleClose = () => {
    setSelectedMedia(null);
    setUploading(false);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <LinearGradient colors={['#1E1E1E', '#2A2A2A', '#1E1E1E']} style={styles.container}>
        <BlurView intensity={50} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Send Media</Text>
            <View style={styles.placeholder} />
          </View>
        </BlurView>

        <View style={styles.content}>
          {!selectedMedia ? (
            <View style={styles.optionsContainer}>
              <Text style={styles.instructionText}>Choose media to send</Text>
              
              <View style={styles.optionsGrid}>
                <TouchableOpacity style={styles.option} onPress={handleCamera}>
                  <LinearGradient
                    colors={['#6C5CE7', '#5A4FCF']}
                    style={styles.optionGradient}
                  >
                    <Camera size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.optionText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} onPress={handleImagePicker}>
                  <LinearGradient
                    colors={['#E74C3C', '#C0392B']}
                    style={styles.optionGradient}
                  >
                    <ImageIcon size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.optionText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} onPress={handleDocumentPicker}>
                  <LinearGradient
                    colors={['#F39C12', '#E67E22']}
                    style={styles.optionGradient}
                  >
                    <File size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.optionText}>Document</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Preview</Text>
              
              <View style={styles.mediaPreview}>
                {selectedMedia.type === 'image' && (
                  <Image 
                    source={{ uri: selectedMedia.uri }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                )}
                
                {selectedMedia.type === 'video' && (
                  <View style={styles.videoPreview}>
                    <Image 
                      source={{ uri: selectedMedia.uri }} 
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <View style={styles.videoOverlay}>
                      <Text style={styles.videoText}>Video</Text>
                    </View>
                  </View>
                )}
                
                {selectedMedia.type === 'document' && (
                  <View style={styles.documentPreview}>
                    <File size={48} color="#6C5CE7" />
                    <Text style={styles.documentName} numberOfLines={2}>
                      {selectedMedia.name}
                    </Text>
                    <Text style={styles.documentSize}>
                      {formatFileSize(selectedMedia.size)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => setSelectedMedia(null)}
                  disabled={uploading}
                >
                  <Text style={styles.cancelButtonText}>Change</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.sendButton, uploading && styles.sendButtonDisabled]} 
                  onPress={handleSendMedia}
                  disabled={uploading}
                >
                  <LinearGradient
                    colors={uploading ? ['#555', '#444'] : ['#6C5CE7', '#5A4FCF']}
                    style={styles.sendButtonGradient}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Send size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.sendButtonText}>
                      {uploading ? 'Sending...' : 'Send'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {uploading && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${uploadProgress}%` }]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  option: {
    alignItems: 'center',
    gap: 12,
  },
  optionGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  mediaPreview: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  videoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  documentPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  documentName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '80%',
  },
  documentSize: {
    fontSize: 14,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 16,
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});