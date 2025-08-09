import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, Share2, Bookmark, Music, Volume2, VolumeX, Play, Pause, Trash2 } from 'lucide-react-native';
import { Reel } from '../data/mockReels';
import { useComments } from '../contexts/CommentContext';
import CommentSystem from './CommentSystem';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  onLike: (reelId: string) => void;
  onSave: (reelId: string) => void;
  onComment: (reelId: string) => void;
  onShare: (reelId: string) => void;
  onDelete?: (reelId: string, reelUsername: string) => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ReelItem({
  reel,
  isActive,
  onLike,
  onSave,
  onComment,
  onShare,
  onDelete,
}: ReelItemProps) {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [likes, setLikes] = useState(reel.likes);
  const [showComments, setShowComments] = useState(false);
  const [showMusicInfo, setShowMusicInfo] = useState(false);
  const { getCommentCount } = useComments();

  // Animation values
  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const heartExplosion = useSharedValue(0);
  const musicPulse = useSharedValue(0);
  const playButtonOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      videoRef.current?.playAsync();
      
      // Start music pulse animation
      if (reel.musicInfo) {
        musicPulse.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 800 }),
            withTiming(1, { duration: 800 })
          ),
          -1,
          true
        );
      }
    } else {
      setIsPlaying(false);
      videoRef.current?.pauseAsync();
    }
  }, [isActive]);

  // Pause video when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Pause video when component unmounts or screen loses focus
        if (videoRef.current) {
          videoRef.current.pauseAsync();
          setIsPlaying(false);
        }
      };
    }, [])
  );

  const handleUserPress = () => {
    if (!reel?.user?.id || !currentUser?.id) return;
    
    if (reel?.user?.id === currentUser?.id) {
      Alert.alert(
        'Your Profile',
        'You are viewing your own profile.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
    } else {
      router.push({
        pathname: '/ProfileScreen',
        params: { userId: reel.user.id }
      });
    }
  };

  const handleLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
    
    likeScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    
    onLike(reel.id);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
      
      // Heart explosion animation
      heartExplosion.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setIsSaved(!isSaved);
    saveScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    
    onSave(reel.id);
  };

  const handleCommentPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commentScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    setShowComments(true);
  };

  const handleSharePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    shareScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onShare(reel.id);
  };

  const handleCloseComments = () => {
    setShowComments(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
      setIsPlaying(false);
      playButtonOpacity.value = withTiming(1, { duration: 200 });
    } else {
      videoRef.current?.playAsync();
      setIsPlaying(true);
      playButtonOpacity.value = withTiming(0, { duration: 200 });
    }
  };

  const handleVolumeToggle = () => {
    setIsMuted(!isMuted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMusicPress = () => {
    setShowMusicInfo(true);
    setTimeout(() => setShowMusicInfo(false), 3000);
  };

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      runOnJS(handleDoubleTap)();
    });

  // Single tap gesture
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      runOnJS(handlePlayPause)();
    });

  const tapGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);

  // Animated styles
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const commentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const shareAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  const heartExplosionStyle = useAnimatedStyle(() => ({
    opacity: heartExplosion.value,
    transform: [
      { scale: interpolate(heartExplosion.value, [0, 1], [0.5, 2.5]) },
    ],
  }));

  const musicPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: musicPulse.value }],
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    opacity: playButtonOpacity.value,
  }));

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const commentCount = getCommentCount(reel.id);

  return (
    <>
      <View style={styles.container}>
        <GestureDetector gesture={tapGesture}>
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: reel.videoUrl }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isActive && isPlaying}
              isLooping
              isMuted={isMuted}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) {
                  setIsLoading(false);
                }
              }}
            />
            
            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingSpinner} />
              </View>
            )}
            
            {/* Play button overlay */}
            <Animated.View style={[styles.playButtonOverlay, playButtonStyle]}>
              <View style={styles.playButton}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Animated.View>
            
            {/* Heart explosion */}
            <Animated.View style={[styles.heartExplosion, heartExplosionStyle]}>
              <Heart size={80} color="#6C5CE7" fill="#6C5CE7" />
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Top overlay - Volume toggle only */}
        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.volumeButton} onPress={handleVolumeToggle}>
            {isMuted ? (
              <VolumeX size={18} color="#FFFFFF" />
            ) : (
              <Volume2 size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Right side actions - Center aligned */}
        <View style={styles.rightActions}>
          <Animated.View style={likeAnimatedStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <View style={styles.actionIconContainer}>
                <Heart
                  size={24}
                  color={isLiked ? '#6C5CE7' : '#FFFFFF'}
                  fill={isLiked ? '#6C5CE7' : 'transparent'}
                  strokeWidth={2}
                />
              </View>
              <Text style={styles.actionText}>{formatNumber(likes)}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={commentAnimatedStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCommentPress}
            >
              <View style={styles.actionIconContainer}>
                <MessageCircle size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={shareAnimatedStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSharePress}
            >
              <View style={styles.actionIconContainer}>
                <Share2 size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>{formatNumber(reel.shares)}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={saveAnimatedStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSave}
            >
              <View style={styles.actionIconContainer}>
                <Bookmark
                  size={24}
                  color={isSaved ? '#6C5CE7' : '#FFFFFF'}
                  fill={isSaved ? '#6C5CE7' : 'transparent'}
                  strokeWidth={2}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Delete Button - Only show for reel owner */}
          {currentUser && reel.user && reel.user.id === currentUser.id && onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => onDelete(reel.id, reel.user?.username || '')}
            >
              <View style={[styles.actionIconContainer, styles.deleteIconContainer]}>
                <Trash2 size={20} color="#FF6B6B" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Music info - Bottom right */}
        {reel.musicInfo && (
          <View style={styles.musicContainer}>
            <TouchableOpacity onPress={handleMusicPress}>
              <Animated.View style={[styles.musicButton, musicPulseStyle]}>
                <Music size={18} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom overlay - User info and caption */}
        <View style={styles.bottomOverlay}>
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
            style={styles.bottomGradient}
          >
            {/* User info - Bottom left */}
            <View style={styles.userInfoContainer}>
              <TouchableOpacity onPress={handleUserPress} style={styles.userInfo}>
                <Image 
                  source={{ uri: reel?.user?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' }} 
                  style={styles.avatar} 
                />
                <View style={styles.userDetails}>
                  <Text style={styles.username}>@{reel?.user?.username || 'Guest'}</Text>
                  <Text style={styles.timestamp}>{reel?.timestamp || 'Just now'}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Caption and hashtags */}
            <View style={styles.captionContainer}>
              <Text style={styles.caption} numberOfLines={2}>
                {reel?.caption || ''}
              </Text>
              
              {/* Hashtags */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.hashtagScroll}
                contentContainerStyle={styles.hashtagContainer}
              >
                {reel?.hashtags?.map((hashtag, index) => (
                  <TouchableOpacity key={index} style={styles.hashtag}>
                    <Text style={styles.hashtagText}>{hashtag}</Text>
                  </TouchableOpacity>
                )) || []}
              </ScrollView>
            </View>

            {/* Music info overlay */}
            {showMusicInfo && reel?.musicInfo && (
              <View style={styles.musicInfoOverlay}>
                <Music size={16} color="#FFFFFF" />
                <Text style={styles.musicText} numberOfLines={1}>
                  {reel?.musicInfo?.title || 'Unknown'} • {reel?.musicInfo?.artist || 'Artist'}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
      
      {/* Comment System */}
      <CommentSystem
        visible={showComments}
        onClose={handleCloseComments}
        postId={reel.id}
        postType="reel"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
  },
  loadingSpinner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#6C5CE7',
    borderTopColor: 'transparent',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  heartExplosion: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -120,
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deleteActionButton: {
    marginTop: 8,
  },
  deleteIconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
  },
  musicContainer: {
    position: 'absolute',
    bottom: 140,
    right: 16,
  },
  musicButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bottomGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  userInfoContainer: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captionContainer: {
    maxWidth: '75%',
  },
  caption: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hashtagScroll: {
    marginTop: 4,
  },
  hashtagContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 20,
  },
  hashtag: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hashtagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  musicInfoOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  musicText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
});