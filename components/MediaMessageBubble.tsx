import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { Play, Download, X, Share, File, Eye } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { debug, useDebugLogger } from '@/utils/debugLogger';

const { width, height } = Dimensions.get('window');

interface MediaMessageBubbleProps {
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  fileName?: string;
  isCurrentUser: boolean;
  timestamp: string;
  onDownload?: (url: string) => void;
}

export default function MediaMessageBubble({
  mediaUrl,
  mediaType,
  fileName,
  isCurrentUser,
  timestamp,
  onDownload,
}: MediaMessageBubbleProps) {
  const debugLogger = useDebugLogger('MediaMessageBubble');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [videoStatus, setVideoStatus] = useState<any>({});

  const formatTimestamp = (timestamp: string) => {
    const messageTime = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return messageTime.toLocaleDateString();
  };

  const getFileExtension = (url: string) => {
    const fileName = url.split('/').pop() || '';
    const extension = fileName.split('.').pop();
    return extension?.toUpperCase() || 'FILE';
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      debugLogger.process('MEDIA', 'DOWNLOAD_START', `Downloading media: ${mediaUrl}`);

      const fileUri = FileSystem.documentDirectory + (fileName || `download_${Date.now()}`);
      const downloadResult = await FileSystem.downloadAsync(mediaUrl, fileUri);

      if (downloadResult.status === 200) {
        debugLogger.success('MEDIA', 'DOWNLOAD_SUCCESS', `Downloaded to: ${downloadResult.uri}`);
        
        // Simple success message instead of sharing
        Alert.alert(
          'Download Complete',
          'File has been downloaded successfully!',
          [
            { text: 'OK', style: 'default' }
          ]
        );

        if (onDownload) {
          onDownload(downloadResult.uri);
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      debugLogger.error('MEDIA', 'DOWNLOAD_ERROR', 'Failed to download media', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const renderImageMessage = () => (
    <TouchableOpacity
      style={[styles.mediaContainer, isCurrentUser ? styles.userMedia : styles.otherMedia]}
      onPress={() => setShowFullScreen(true)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: mediaUrl }} 
        style={styles.imageMessage}
        resizeMode="cover"
      />
      <View style={styles.mediaOverlay}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleDownload}
          disabled={downloading}
        >
          <Download size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={[styles.timestampContainer, isCurrentUser ? styles.userTimestamp : styles.otherTimestamp]}>
        <Text style={styles.timestampText}>{formatTimestamp(timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderVideoMessage = () => (
    <View style={[styles.mediaContainer, isCurrentUser ? styles.userMedia : styles.otherMedia]}>
      <Video
        source={{ uri: mediaUrl }}
        style={styles.videoMessage}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        useNativeControls
        onPlaybackStatusUpdate={setVideoStatus}
      />
      <View style={styles.mediaOverlay}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleDownload}
          disabled={downloading}
        >
          <Download size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowFullScreen(true)}
        >
          <Eye size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={[styles.timestampContainer, isCurrentUser ? styles.userTimestamp : styles.otherTimestamp]}>
        <Text style={styles.timestampText}>{formatTimestamp(timestamp)}</Text>
      </View>
    </View>
  );

  const renderDocumentMessage = () => (
    <TouchableOpacity
      style={[styles.documentContainer, isCurrentUser ? styles.userDocument : styles.otherDocument]}
      onPress={handleDownload}
      disabled={downloading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isCurrentUser ? ['#6C5CE7', '#5A4FCF'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.documentGradient}
      >
        <View style={styles.documentContent}>
          <View style={styles.documentIcon}>
            <File size={24} color="#FFFFFF" />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={2}>
              {fileName || 'Document'}
            </Text>
            <Text style={styles.documentType}>
              {getFileExtension(mediaUrl)} • Tap to download
            </Text>
          </View>
          <View style={styles.documentAction}>
            <Download size={20} color="#FFFFFF" />
          </View>
        </View>
        <View style={[styles.timestampContainer, isCurrentUser ? styles.userTimestamp : styles.otherTimestamp]}>
          <Text style={styles.timestampText}>{formatTimestamp(timestamp)}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFullScreenModal = () => (
    <Modal
      visible={showFullScreen}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => setShowFullScreen(false)}
    >
      <View style={styles.fullScreenContainer}>
        <BlurView intensity={100} style={styles.fullScreenBlur}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowFullScreen(false)}
          >
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.fullScreenContent}>
            {mediaType === 'image' && (
              <Image 
                source={{ uri: mediaUrl }} 
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
            
            {mediaType === 'video' && (
              <Video
                source={{ uri: mediaUrl }}
                style={styles.fullScreenVideo}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                isLooping={false}
                useNativeControls
              />
            )}
          </View>

          <View style={styles.fullScreenActions}>
            <TouchableOpacity 
              style={styles.fullScreenActionButton}
              onPress={handleDownload}
              disabled={downloading}
            >
              <LinearGradient
                colors={['#6C5CE7', '#5A4FCF']}
                style={styles.actionButtonGradient}
              >
                <Download size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {downloading ? 'Downloading...' : 'Download'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );

  return (
    <>
      {mediaType === 'image' && renderImageMessage()}
      {mediaType === 'video' && renderVideoMessage()}
      {mediaType === 'document' && renderDocumentMessage()}
      {(mediaType === 'image' || mediaType === 'video') && renderFullScreenModal()}
    </>
  );
}

const styles = StyleSheet.create({
  mediaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    maxWidth: width * 0.7,
    minWidth: 200,
  },
  userMedia: {
    alignSelf: 'flex-end',
  },
  otherMedia: {
    alignSelf: 'flex-start',
  },
  imageMessage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  videoMessage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 20,
  },
  documentContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: width * 0.7,
    minWidth: 250,
  },
  userDocument: {
    alignSelf: 'flex-end',
  },
  otherDocument: {
    alignSelf: 'flex-start',
  },
  documentGradient: {
    padding: 16,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentType: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  documentAction: {
    padding: 8,
  },
  timestampContainer: {
    marginTop: 8,
  },
  userTimestamp: {
    alignItems: 'flex-end',
  },
  otherTimestamp: {
    alignItems: 'flex-start',
  },
  timestampText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  fullScreenBlur: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  fullScreenActions: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  fullScreenActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});