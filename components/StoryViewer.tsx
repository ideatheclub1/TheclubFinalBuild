import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  Alert,
  Platform,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { X, Heart, MessageCircle, Share2, MoreHorizontal, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Trash2, Send } from 'lucide-react-native';
import CachedImage from './CachedImage';
import ShareToUserModal from './ShareToUserModal';
import * as Haptics from 'expo-haptics';
import { Story } from '../types';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_STORY_DURATION = 5000; // 5 seconds for image stories

export default function StoryViewer({
  visible,
  stories,
  initialStoryIndex,
  onClose,
}: StoryViewerProps) {
  const router = useRouter();
  const { user: currentUser } = useUser();
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoStatus, setVideoStatus] = useState<any>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<Video>(null);
  const progressAnimation = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const currentStory = stories[currentStoryIndex];

  // Helper function to determine if current story is a video
  const isVideoStory = (story: Story) => {
    const hasVideoType = story?.mediaType === 'video' || story?.mediaType === 'reel';
    const hasVideoUrl = !!story?.videoUrl;
    const imageHasVideoExtension = story?.image && (
      story.image.includes('.mp4') ||
      story.image.includes('.mov') ||
      story.image.includes('.avi') ||
      story.image.includes('.webm') ||
      story.image.includes('.m4v')
    );
    
    const isVideo = hasVideoType || hasVideoUrl || imageHasVideoExtension;
    
    // Debug logging
    console.log('🎥 STORY_VIEWER - Video detection:', {
      storyId: story?.id,
      mediaType: story?.mediaType,
      hasVideoUrl: hasVideoUrl,
      videoUrl: story?.videoUrl,
      imageUrl: story?.image,
      imageHasVideoExtension: imageHasVideoExtension,
      isVideo: isVideo
    });
    
    return isVideo;
  };

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15 });
      setCurrentStoryIndex(initialStoryIndex);
      setIsLoaded(false); // Reset loaded state
      setIsVideoPlaying(true); // Reset video state
      startStoryTimer();
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
      setIsLoaded(false);
      pauseStoryTimer();
    }
  }, [visible, initialStoryIndex]);

  // Handle story changes
  useEffect(() => {
    if (visible && currentStory) {
      setIsLoaded(false);
      setIsVideoPlaying(true);
      startStoryTimer();
    }
  }, [currentStoryIndex]);

  // Story timer management
  const startStoryTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // For video stories, don't start a timer - let the video control duration
    if (isVideoStory(currentStory)) {
      // For videos, reset progress but don't start timer
      progressAnimation.value = 0;
      return;
    }
    
    // For image stories, use the normal timer
    progressAnimation.value = 0;
    progressAnimation.value = withTiming(1, { duration: IMAGE_STORY_DURATION }, (finished) => {
      if (finished) {
        runOnJS(goToNextStory)();
      }
    });
  };

  const pauseStoryTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resumeStoryTimer = () => {
    if (!isPaused) {
      startStoryTimer();
    }
  };

  // Navigation functions
  const goToNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setIsLoaded(false); // Reset loaded state for new story
      setIsVideoPlaying(true); // Reset video playing state
      startStoryTimer();
    } else {
      handleClose();
    }
  };

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setIsLoaded(false); // Reset loaded state for new story
      setIsVideoPlaying(true); // Reset video playing state
      startStoryTimer();
    }
  };

  // Gesture handlers
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
    },
    onPanResponderGrant: () => {
      setIsPaused(true);
      pauseStoryTimer();
    },
    onPanResponderMove: (_, gestureState) => {
      // Handle swipe gestures
    },
    onPanResponderRelease: (_, gestureState) => {
      setIsPaused(false);
      
      if (gestureState.dy > 100) {
        // Swipe down to close
        handleClose();
      } else if (gestureState.dx > 50) {
        // Swipe right to go to previous story
        goToPreviousStory();
      } else if (gestureState.dx < -50) {
        // Swipe left to go to next story
        goToNextStory();
      } else {
        // Resume timer if no significant gesture
        resumeStoryTimer();
      }
    },
  });

  // Touch handlers
  const handleScreenPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const halfScreen = SCREEN_WIDTH / 2;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }

    if (locationX < halfScreen) {
      goToPreviousStory();
    } else {
      goToNextStory();
    }
  };

  const handleLongPress = () => {
    setIsPaused(true);
    pauseStoryTimer();
  };

  const handlePressOut = () => {
    if (isPaused) {
      setIsPaused(false);
      resumeStoryTimer();
    }
  };

  const handleClose = () => {
    pauseStoryTimer();
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onClose)();
    });
  };

  const handleUserPress = () => {
    if (currentStory?.user?.id && currentStory.user.id !== currentUser?.id) {
      handleClose();
      router.push(`/profile/${currentStory.user.id}`);
    }
  };

  const handleShare = () => {
    if (!currentStory?.user?.id) return;
    
    // Navigate to messages with story share
    handleClose();
    router.push({
      pathname: '/(tabs)/messages',
      params: { 
        shareType: 'story',
        storyId: currentStory.id,
        storyUserName: currentStory.user.username,
        storyMediaUrl: currentStory.image || currentStory.videoUrl
      }
    });
  };

  const handleSendToChat = () => {
    if (!currentStory?.user?.id) return;
    setShowShareModal(true);
  };

  const handleReply = () => {
    if (!currentStory?.user?.id || currentStory.user.id === currentUser?.id) return;
    
    // Navigate to direct conversation with story attached
    handleClose();
    router.push({
      pathname: '/conversation',
      params: { 
        userId: currentStory.user.id,
        userName: currentStory.user.username,
        replyToStory: 'true',
        storyId: currentStory.id,
        storyMediaUrl: currentStory.image || currentStory.videoUrl
      }
    });
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !currentUser || currentStory.user.id !== currentUser.id) {
      return;
    }

    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              
              const success = await dataService.story.deleteStory(currentStory.id, currentUser.id);
              
              if (success) {
                console.log('Story deleted successfully');
                // If there are more stories, move to next, otherwise close
                if (stories.length > 1) {
                  const newIndex = currentStoryIndex >= stories.length - 1 ? 0 : currentStoryIndex;
                  setCurrentStoryIndex(newIndex);
                } else {
                  handleClose();
                }
              } else {
                Alert.alert('Error', 'Failed to delete story. Please try again.');
              }
            } catch (error) {
              console.error('Delete story error:', error);
              Alert.alert('Error', 'Failed to delete story. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressAnimation.value, [0, 1], [0, 100])}%`,
  }));

  if (!visible || !currentStory) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      
      <View style={styles.container}>
        <Animated.View style={[styles.storyContainer, containerStyle]} {...panResponder.panHandlers}>
          {/* Progress Bars */}
          <View style={styles.progressContainer}>
            {stories.map((_, index) => (
              <View key={index} style={styles.progressBar}>
                <View style={styles.progressBarBackground} />
                <Animated.View 
                  style={[
                    styles.progressBarFill,
                    index === currentStoryIndex ? progressBarStyle : {
                      width: index < currentStoryIndex ? '100%' : '0%'
                    }
                  ]} 
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent']}
            style={styles.headerGradient}
          >
            <BlurView intensity={20} style={styles.header}>
              <TouchableOpacity onPress={handleUserPress} style={styles.userInfo}>
                <CachedImage 
                  source={{ uri: currentStory.user?.avatar || 'https://via.placeholder.com/150' }} 
                  style={styles.avatar} 
                  cacheType="thumbnail"
                />
                <View style={styles.userTextContainer}>
                  <Text style={styles.username}>{currentStory.user?.username || 'Unknown User'}</Text>
                  <Text style={styles.timeAgo}>
                    {new Date(currentStory.createdAt || Date.now()).toLocaleTimeString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.headerActions}>
                {currentStory.user?.id !== currentUser?.id && (
                  <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                    <Share2 size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                
                {/* Delete button - only show for current user's stories */}
                {currentUser && currentStory.user.id === currentUser.id && (
                  <TouchableOpacity 
                    onPress={handleDeleteStory} 
                    style={[styles.actionButton, isDeleting && styles.actionButtonDisabled]}
                    disabled={isDeleting}
                  >
                    <Trash2 size={24} color={isDeleting ? "#888888" : "#FF6B6B"} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity onPress={handleClose} style={styles.actionButton}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </BlurView>
          </LinearGradient>

          {/* Story Content */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleScreenPress}
            onLongPress={handleLongPress}
            onPressOut={handlePressOut}
            style={styles.storyContent}
          >
            {/* Render video for video/reel stories */}
            {isVideoStory(currentStory) ? (
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: currentStory.videoUrl || currentStory.video || currentStory.image || '' }}
                  style={styles.storyVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isVideoPlaying && !isPaused}
                  isLooping={false}
                  isMuted={isMuted}
                  onPlaybackStatusUpdate={(status) => {
                    setVideoStatus(status);
                    if (status.isLoaded && status.durationMillis) {
                      setIsLoaded(true);
                      
                      // Update progress bar based on video playback
                      const progress = status.positionMillis / status.durationMillis;
                      progressAnimation.value = progress;
                      
                      // Auto-advance when video ends
                      if (status.didJustFinish) {
                        goToNextStory();
                      }
                    }
                  }}
                  onLoad={() => setIsLoaded(true)}
                />
                
                {/* Video Controls */}
                <View style={styles.videoControls}>
                  <TouchableOpacity
                    style={styles.muteButton}
                    onPress={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? (
                      <VolumeX size={20} color="rgba(255,255,255,0.8)" />
                    ) : (
                      <Volume2 size={20} color="rgba(255,255,255,0.8)" />
                    )}
                  </TouchableOpacity>
                  
                  {/* Send to Chat Button */}
                  <TouchableOpacity
                    style={styles.sendToChatButton}
                    onPress={handleSendToChat}
                  >
                    <Send size={20} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Render image for image stories - Using regular Image temporarily for debugging */
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: currentStory.image || currentStory.imageUrl || 'https://via.placeholder.com/400x800' }}
                  style={styles.storyImage}
                  resizeMode="contain"
                  onLoad={() => {
                    setIsLoaded(true);
                    console.log('✅ Story image loaded successfully:', currentStory.image || currentStory.imageUrl);
                  }}
                  onError={(error) => {
                    console.error('❌ Story image load error:', error);
                    console.log('❌ Failed URL:', currentStory.image || currentStory.imageUrl);
                    console.log('❌ Story data:', currentStory);
                  }}
                />
                
                {/* Image Story Controls */}
                <View style={styles.imageControls}>
                  <TouchableOpacity
                    style={styles.sendToChatButton}
                    onPress={handleSendToChat}
                  >
                    <Send size={20} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Navigation Arrows */}
          {currentStoryIndex > 0 && (
            <TouchableOpacity onPress={goToPreviousStory} style={[styles.navButton, styles.navButtonLeft]}>
              <ChevronLeft size={32} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
          
          {currentStoryIndex < stories.length - 1 && (
            <TouchableOpacity onPress={goToNextStory} style={[styles.navButton, styles.navButtonRight]}>
              <ChevronRight size={32} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}

          {/* Bottom Action Bar */}
          {currentStory.user?.id !== currentUser?.id && (
            <View style={styles.bottomActionBar}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.bottomGradient}
              >
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.replyButton}
                    onPress={handleReply}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={24} color="#FFFFFF" />
                    <Text style={styles.actionText}>Reply</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={handleShare}
                    activeOpacity={0.8}
                  >
                    <Share2 size={24} color="#FFFFFF" />
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Paused Indicator */}
          {isPaused && (
            <View style={styles.pausedIndicator}>
              <Text style={styles.pausedText}>Paused</Text>
            </View>
          )}
        </Animated.View>
      </View>
      
      {/* Share to User Modal */}
      <ShareToUserModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        sharedStory={currentStory}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
  },
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 30 : 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
    zIndex: 100,
  },
  progressBar: {
    flex: 1,
    height: 3,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBarFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 99,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 45 : 65,
    paddingBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  storyContent: {
    flex: 1,
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  storyVideo: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  muteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendToChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageControls: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 98,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  pausedIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 101,
  },
  pausedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 97,
  },
  bottomGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'android' ? 20 : 40,
    paddingHorizontal: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
