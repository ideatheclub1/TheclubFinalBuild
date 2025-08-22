import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { 
  Play, 
  Pause, 
  Volume2, 
  Heart, 
  MessageCircle, 
  Share,
  User
} from 'lucide-react-native';
import { Message, User as UserType, Post, Reel } from '@/types';
import { generateThumbnailAtTime } from '@/utils/videoThumbnailGenerator';

const { width } = Dimensions.get('window');

interface MediaMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  otherUser?: UserType;
  onImagePress?: (imageUri: string) => void;
  onContentPress?: (content: Post | Reel) => void;
  onLongPress?: (message: Message) => void;
}

export default function MediaMessageBubble({
  message,
  isOwn,
  otherUser,
  onImagePress,
  onContentPress,
  onLongPress
}: MediaMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<{[key: string]: string}>({});
  const soundRef = useRef<Audio.Sound | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Generate thumbnail for video stories
  useEffect(() => {
    const generateStoryThumbnail = async () => {
      if (message.type === 'story' && message.sharedStory) {
        const story = message.sharedStory;
        const isVideoStory = story.mediaType === 'video' || 
                            story.videoUrl || 
                            story.video ||
                            (story.image && story.image.includes('.mp4'));
        
        if (isVideoStory && !generatedThumbnails[story.id]) {
          const videoUrl = story.videoUrl || story.video || story.image;
          if (videoUrl) {
            try {
              console.log('🎬 Generating thumbnail for video story:', story.id);
              const thumbnail = await generateThumbnailAtTime(videoUrl, 100); // 0.1 seconds
              if (thumbnail) {
                setGeneratedThumbnails(prev => ({
                  ...prev,
                  [story.id]: thumbnail.uri
                }));
                console.log('✅ Thumbnail generated for story:', story.id);
              }
            } catch (error) {
              console.error('❌ Failed to generate thumbnail for story:', error);
            }
          }
        }
      }
    };

    generateStoryThumbnail();
  }, [message.type, message.sharedStory?.id, message.sharedStory?.videoUrl, message.sharedStory?.video, message.sharedStory?.image]);

  // Handle voice message playback
  const toggleVoicePlayback = async () => {
    try {
      if (!message.mediaUrl) return;

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: message.mediaUrl },
          { shouldPlay: false }
        );
        soundRef.current = sound;

        // Set up playback status update
        soundRef.current.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis || 0);
            setPlaybackDuration(status.durationMillis || 0);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
            }
          }
        });
      }

      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'Failed to play voice message');
    }
  };

  // Format duration for voice messages
  const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle long press
  const handleLongPress = () => {
    console.log('🔥 LONG_PRESS - Message bubble long pressed:', { messageId: message.id, messageType: message.type });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onLongPress?.(message);
  };

  // Render different message types
  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <View>
            <Text style={[
              styles.messageText, 
              isOwn && styles.ownMessageText,
              message.isDeleted && styles.deletedMessageText
            ]}>
              {message.content}
            </Text>
            {message.isEdited && !message.isDeleted && (
              <Text style={[styles.editedLabel, isOwn && styles.ownEditedLabel]}>
                edited
              </Text>
            )}
          </View>
        );

      case 'image':
        return (
          <TouchableOpacity
            onPress={() => onImagePress?.(message.mediaUrl!)}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: message.mediaUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            {message.content && (
              <Text style={[styles.imageCaption, isOwn && styles.ownMessageText]}>
                {message.content}
              </Text>
            )}
          </TouchableOpacity>
        );

      case 'voice':
        return (
          <TouchableOpacity
            style={styles.voiceContainer}
            onLongPress={handleLongPress}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              onPress={toggleVoicePlayback}
              style={[styles.voicePlayButton, isOwn && styles.ownVoicePlayButton]}
            >
              {isPlaying ? (
                <Pause size={16} color={isOwn ? "#FFFFFF" : "#6C5CE7"} />
              ) : (
                <Play size={16} color={isOwn ? "#FFFFFF" : "#6C5CE7"} />
              )}
            </TouchableOpacity>
            
            <View style={styles.voiceInfo}>
              <View style={[styles.voiceWaveform, isOwn && styles.ownVoiceWaveform]}>
                {/* Simple waveform visualization */}
                {Array.from({ length: 20 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveformBar,
                      isOwn && styles.ownWaveformBar,
                      {
                        height: Math.random() * 20 + 4,
                        opacity: playbackDuration > 0 
                          ? (playbackPosition / playbackDuration) > (index / 20) ? 1 : 0.3
                          : 0.6
                      }
                    ]}
                  />
                ))}
              </View>
              
              <Text style={[styles.voiceDuration, isOwn && styles.ownMessageText]}>
                {playbackDuration > 0 
                  ? formatDuration(playbackPosition) 
                  : formatDuration((message.duration || 0) * 1000)
                }
              </Text>
            </View>

            <Volume2 size={16} color={isOwn ? "#FFFFFF" : "#666"} style={styles.voiceIcon} />
          </TouchableOpacity>
        );

      case 'post':
        console.log('🔥 POST_MESSAGE - sharedPost:', message.sharedPost);
        if (!message.sharedPost) {
          console.log('❌ POST_MESSAGE - sharedPost is null/undefined');
          return (
            <TouchableOpacity
              style={styles.sharedContentContainer}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              <Text style={styles.errorText}>📸 Shared post no longer available</Text>
            </TouchableOpacity>
          );
        }
        
        return (
          <TouchableOpacity
            onPress={() => message.sharedPost && onContentPress?.(message.sharedPost)}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={styles.sharedContentContainer}
          >
            <View style={styles.sharedContentHeader}>
              <Image
                source={{ uri: message.sharedPost?.user.avatar }}
                style={styles.sharedUserAvatar}
              />
              <View style={styles.sharedUserInfo}>
                <Text style={styles.sharedUsername}>@{message.sharedPost?.user.username}</Text>
                <Text style={styles.sharedContentType}>Post</Text>
              </View>
            </View>
            
            {(message.sharedPost?.image || message.sharedPost?.imageUrl) && (
              <Image
                source={{ uri: message.sharedPost.image || message.sharedPost.imageUrl }}
                style={styles.sharedContentImage}
                resizeMode="cover"
              />
            )}
            
            <Text style={styles.sharedContentText} numberOfLines={3}>
              {message.sharedPost?.content}
            </Text>
            
            <View style={styles.sharedContentStats}>
              <View style={styles.statItem}>
                <Heart size={14} color="#FF6B6B" />
                <Text style={styles.statText}>{message.sharedPost?.likes || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <MessageCircle size={14} color="#6C5CE7" />
                <Text style={styles.statText}>{message.sharedPost?.comments || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );

      case 'reel':
        console.log('🔥 REEL_MESSAGE - sharedReel:', message.sharedReel);
        if (!message.sharedReel) {
          console.log('❌ REEL_MESSAGE - sharedReel is null/undefined');
          return (
            <TouchableOpacity
              style={styles.sharedContentContainer}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              <Text style={styles.errorText}>📹 Shared reel no longer available</Text>
            </TouchableOpacity>
          );
        }
        
        return (
          <TouchableOpacity
            onPress={() => message.sharedReel && onContentPress?.(message.sharedReel)}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={styles.sharedContentContainer}
          >
            <View style={styles.sharedContentHeader}>
              <Image
                source={{ uri: message.sharedReel?.user.avatar }}
                style={styles.sharedUserAvatar}
              />
              <View style={styles.sharedUserInfo}>
                <Text style={styles.sharedUsername}>@{message.sharedReel?.user.username}</Text>
                <Text style={styles.sharedContentType}>Reel</Text>
              </View>
            </View>
            
            <View style={styles.reelThumbnailContainer}>
              <Image
                source={{ uri: message.sharedReel?.thumbnailUrl || message.sharedReel?.user.avatar }}
                style={styles.sharedContentImage}
                resizeMode="cover"
              />
              <View style={styles.playOverlay}>
                <Play size={24} color="#FFFFFF" />
              </View>
            </View>
            
            <Text style={styles.sharedContentText} numberOfLines={2}>
              {message.sharedReel?.caption}
            </Text>
            
            <View style={styles.sharedContentStats}>
              <View style={styles.statItem}>
                <Heart size={14} color="#FF6B6B" />
                <Text style={styles.statText}>{message.sharedReel?.likes || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <MessageCircle size={14} color="#6C5CE7" />
                <Text style={styles.statText}>{message.sharedReel?.comments || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Share size={14} color="#00D084" />
                <Text style={styles.statText}>{message.sharedReel?.shares || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );

      case 'story':
        console.log('🔥 STORY_MESSAGE - sharedStory:', message.sharedStory);
        if (!message.sharedStory) {
          console.log('❌ STORY_MESSAGE - sharedStory is null/undefined');
          return (
            <TouchableOpacity
              style={styles.sharedContentContainer}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              <Text style={styles.errorText}>📖 Shared story no longer available</Text>
            </TouchableOpacity>
          );
        }
        
        // Check if story has expired
        const storyExpiresAt = new Date(message.sharedStory.expiresAt || message.sharedStory.expires_at);
        const isExpired = storyExpiresAt <= new Date();
        
        if (isExpired) {
          return (
            <TouchableOpacity
              style={styles.sharedContentContainer}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              <View style={styles.sharedContentHeader}>
                <Image
                  source={{ uri: message.sharedStory?.user?.avatar }}
                  style={styles.sharedUserAvatar}
                />
                <View style={styles.sharedUserInfo}>
                  <Text style={styles.sharedUsername}>@{message.sharedStory?.user?.username}</Text>
                  <Text style={styles.sharedContentType}>Story</Text>
                </View>
              </View>
              
              <View style={styles.expiredStoryContainer}>
                <Text style={styles.expiredStoryText}>📖 This story has expired</Text>
                <Text style={styles.expiredStorySubtext}>
                  Stories are only available for 24 hours
                </Text>
              </View>
            </TouchableOpacity>
          );
        }
        
        return (
          <TouchableOpacity
            onPress={() => message.sharedStory && onContentPress?.(message.sharedStory)}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={styles.sharedContentContainer}
          >
            <View style={styles.sharedContentHeader}>
              <Image
                source={{ uri: message.sharedStory?.user?.avatar }}
                style={styles.sharedUserAvatar}
              />
              <View style={styles.sharedUserInfo}>
                <Text style={styles.sharedUsername}>@{message.sharedStory?.user?.username}</Text>
                <Text style={styles.sharedContentType}>Story</Text>
              </View>
            </View>
            
            <View style={styles.storyThumbnailContainer}>
              <Image
                source={{ 
                  uri: (() => {
                    // Check if we have a generated thumbnail first
                    if (message.sharedStory?.id && generatedThumbnails[message.sharedStory.id]) {
                      return generatedThumbnails[message.sharedStory.id];
                    }
                    
                    // For video stories, try to get thumbnail first, then fallback to video URL
                    if (message.sharedStory?.mediaType === 'video' || 
                        message.sharedStory?.videoUrl || 
                        message.sharedStory?.video ||
                        (message.sharedStory?.image && message.sharedStory.image.includes('.mp4'))) {
                      
                      // Try thumbnail URL first
                      if (message.sharedStory?.thumbnailUrl) {
                        return message.sharedStory.thumbnailUrl;
                      }
                      
                      // Generate thumbnail URL from video URL (if following thumbnail naming convention)
                      const videoUrl = message.sharedStory?.videoUrl || message.sharedStory?.video || message.sharedStory?.image;
                      if (videoUrl && videoUrl.includes('.mp4')) {
                        return videoUrl.replace('.mp4', '_thumbnail.jpg');
                      }
                      
                      return videoUrl || 'https://via.placeholder.com/150?text=Video';
                    }
                    
                    // For image stories, use the image URL directly
                    return message.sharedStory?.image || 
                           message.sharedStory?.imageUrl || 
                           'https://via.placeholder.com/150?text=Story';
                  })()
                }}
                style={styles.sharedContentImage}
                resizeMode="cover"
                onError={() => {
                  console.log('Story thumbnail load failed, falling back to placeholder');
                }}
              />
              
              {/* Story indicator */}
              <View style={styles.storyIndicator}>
                <Text style={styles.storyIndicatorText}>STORY</Text>
              </View>
              
              {/* Video play overlay if it's a video story */}
              {(message.sharedStory?.mediaType === 'video' || message.sharedStory?.videoUrl || message.sharedStory?.video) && (
                <View style={styles.playOverlay}>
                  <Play size={24} color="#FFFFFF" />
                </View>
              )}
            </View>
            
            <Text style={styles.sharedContentText} numberOfLines={2}>
              {message.content}
            </Text>
            
            <View style={styles.storyMetadata}>
              <Text style={styles.storyExpiryText}>
                Expires in {Math.max(0, Math.ceil((storyExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))}h
              </Text>
            </View>
          </TouchableOpacity>
        );

      default:
        return (
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      <TouchableOpacity
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.7}
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          message.type === 'image' && styles.imageBubble,
          message.isDeleted && styles.deletedBubble
        ]}
      >
        {renderMessageContent()}
        
        <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </TouchableOpacity>
      
      {!isOwn && (
        <Image
          source={{ uri: otherUser?.avatar || 'https://via.placeholder.com/32' }}
          style={styles.avatar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: width * 0.75,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
  },
  ownBubble: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 4,
  },
  imageBubble: {
    padding: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  editedLabel: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  ownEditedLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  deletedMessageText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  deletedBubble: {
    opacity: 0.7,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 12,
  },
  imageCaption: {
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    paddingVertical: 4,
  },
  voicePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownVoicePlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceInfo: {
    flex: 1,
    marginRight: 8,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginBottom: 4,
  },
  ownVoiceWaveform: {
    // Styling for own voice messages
  },
  waveformBar: {
    width: 2,
    backgroundColor: '#6C5CE7',
    marginHorizontal: 1,
    borderRadius: 1,
  },
  ownWaveformBar: {
    backgroundColor: '#FFFFFF',
  },
  voiceDuration: {
    fontSize: 12,
    color: '#999',
  },
  voiceIcon: {
    opacity: 0.6,
  },
  sharedContentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    minWidth: width * 0.6,
  },
  sharedContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharedUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  sharedUserInfo: {
    flex: 1,
  },
  sharedUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  sharedContentType: {
    fontSize: 12,
    color: '#999',
  },
  sharedContentImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  reelThumbnailContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedContentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 8,
  },
  sharedContentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  expiredStoryContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  expiredStoryText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  expiredStorySubtext: {
    color: 'rgba(255, 107, 107, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  storyThumbnailContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  storyIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storyIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  storyMetadata: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  storyExpiryText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});