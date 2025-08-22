import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { 
  Send, 
  Plus, 
  Image as ImageIcon, 
  Mic, 
  Video, 
  FileText,
  X,
  Pause,
  Play,
  Square
} from 'lucide-react-native';
import { Post, Reel, Message } from '@/types';

interface MediaMessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSendMessage: (message: Partial<Message>) => void;
  onSendMedia: (type: 'image' | 'voice' | 'reel' | 'post', data: any) => void;
  placeholder?: string;
  disabled?: boolean;
  recentPosts?: Post[];
  recentReels?: Reel[];
}

export default function MediaMessageInput({
  value,
  onChangeText,
  onSendMessage,
  onSendMedia,
  placeholder = "Type a message...",
  disabled = false,
  recentPosts = [],
  recentReels = []
}: MediaMessageInputProps) {
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [contentType, setContentType] = useState<'posts' | 'reels'>('posts');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const menuScaleAnim = useRef(new Animated.Value(0)).current;

  // Request permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    
    return {
      camera: cameraStatus === 'granted',
      media: mediaStatus === 'granted',
      audio: audioStatus === 'granted'
    };
  };

  // Toggle media menu
  const toggleMediaMenu = () => {
    const toValue = showMediaMenu ? 0 : 1;
    setShowMediaMenu(!showMediaMenu);
    
    Animated.spring(menuScaleAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle image picker
  const handleImagePicker = async () => {
    const permissions = await requestPermissions();
    if (!permissions.media) {
      Alert.alert('Permission Required', 'Please grant media library access to share photos.');
      return;
    }

    Alert.alert(
      'Select Photo',
      'Choose how you want to select a photo',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
    setShowMediaMenu(false);
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onSendMedia('image', {
          uri: result.assets[0].uri,
          type: 'image',
          mediaUrl: result.assets[0].uri
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onSendMedia('image', {
          uri: result.assets[0].uri,
          type: 'image',
          mediaUrl: result.assets[0].uri
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  // Handle voice recording
  const startRecording = async () => {
    const permissions = await requestPermissions();
    if (!permissions.audio) {
      Alert.alert('Permission Required', 'Please grant microphone access to record voice messages.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      setShowMediaMenu(false);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (uri) {
        onSendMedia('voice', {
          uri,
          type: 'audio',
          mediaUrl: uri,
          duration: recordingDuration
        });
      }

      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const cancelRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  // Handle content sharing
  const handleContentShare = (type: 'posts' | 'reels') => {
    setContentType(type);
    setShowContentPicker(true);
    setShowMediaMenu(false);
  };

  const shareContent = (content: Post | Reel) => {
    if (contentType === 'posts') {
      onSendMedia('post', {
        type: 'post',
        sharedPost: content,
        content: `Shared a post by ${content.user.username}`
      });
    } else {
      onSendMedia('reel', {
        type: 'reel',
        sharedReel: content,
        content: `Shared a reel by ${content.user.username}`
      });
    }
    setShowContentPicker(false);
  };

  // Send text message
  const handleSendText = () => {
    if (value.trim()) {
      onSendMessage({
        content: value.trim(),
        type: 'text'
      });
      onChangeText('');
    }
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Recording UI */}
      {isRecording && (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingInfo}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording...</Text>
            <Text style={styles.recordingDuration}>{formatDuration(recordingDuration)}</Text>
          </View>
          <View style={styles.recordingActions}>
            <TouchableOpacity onPress={cancelRecording} style={styles.recordingCancel}>
              <X size={20} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={stopRecording} style={styles.recordingStop}>
              <Square size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Normal Input */}
      {!isRecording && (
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            onPress={toggleMediaMenu}
            style={styles.mediaButton}
          >
            <Plus size={24} color="#6C5CE7" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#666"
            multiline
            editable={!disabled}
          />

          <TouchableOpacity 
            style={[styles.sendButton, !value.trim() && styles.sendButtonDisabled]}
            onPress={handleSendText}
            disabled={!value.trim() || disabled}
          >
            <Send size={20} color={value.trim() ? "#FFFFFF" : "#666"} />
          </TouchableOpacity>
        </View>
      )}

      {/* Media Menu */}
      {showMediaMenu && (
        <Animated.View 
          style={[
            styles.mediaMenu,
            {
              transform: [{ scale: menuScaleAnim }],
              opacity: menuScaleAnim
            }
          ]}
        >
          <TouchableOpacity onPress={handleImagePicker} style={styles.mediaOption}>
            <ImageIcon size={24} color="#FFFFFF" />
            <Text style={styles.mediaOptionText}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={startRecording} style={styles.mediaOption}>
            <Mic size={24} color="#FFFFFF" />
            <Text style={styles.mediaOptionText}>Voice</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleContentShare('reels')} 
            style={styles.mediaOption}
          >
            <Video size={24} color="#FFFFFF" />
            <Text style={styles.mediaOptionText}>Reel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleContentShare('posts')} 
            style={styles.mediaOption}
          >
            <FileText size={24} color="#FFFFFF" />
            <Text style={styles.mediaOptionText}>Post</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Content Picker Modal */}
      <Modal
        visible={showContentPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContentPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Share {contentType === 'posts' ? 'Post' : 'Reel'}
            </Text>
            <TouchableOpacity onPress={() => setShowContentPicker(false)}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentList}>
            {(contentType === 'posts' ? recentPosts : recentReels).map((content) => (
              <TouchableOpacity
                key={content.id}
                style={styles.contentItem}
                onPress={() => shareContent(content)}
              >
                <Image 
                  source={{ 
                    uri: contentType === 'posts' 
                      ? (content as Post).image || (content as Post).imageUrl || content.user.avatar
                      : (content as Reel).thumbnailUrl || content.user.avatar
                  }} 
                  style={styles.contentThumbnail} 
                />
                <View style={styles.contentInfo}>
                  <Text style={styles.contentUser}>@{content.user.username}</Text>
                  <Text style={styles.contentText} numberOfLines={2}>
                    {contentType === 'posts' 
                      ? (content as Post).content
                      : (content as Reel).caption
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 107, 0.3)',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginRight: 8,
  },
  recordingText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  recordingDuration: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  recordingCancel: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingStop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaOption: {
    alignItems: 'center',
    padding: 12,
  },
  mediaOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  contentList: {
    flex: 1,
    padding: 16,
  },
  contentItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  contentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  contentUser: {
    color: '#6C5CE7',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
});