import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  Platform,
  Pressable,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Heart, MessageCircle, Share2, Bookmark, Music, Volume2, VolumeX, Play, Trash2, Pause, Trash } from 'lucide-react-native';
import { Reel } from '../data/mockReels';
import { useComments } from '../contexts/CommentContext';
import CommentSystem from './CommentSystem';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getContainerHeight = (insets: any) => {
  if (Platform.OS === 'ios') {
    return SCREEN_HEIGHT - insets.top - insets.bottom;
  }
  return SCREEN_HEIGHT;
};

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
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Like/save/etc
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [likes, setLikes] = useState(reel.likes);

  // Comments & overlays
  const [showComments, setShowComments] = useState(false);
  const [showMusicInfo, setShowMusicInfo] = useState(false);

  // Time & seeking
  const [duration, setDuration] = useState(0);
  const [uiPosition, setUiPosition] = useState(0);         // what the UI shows
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);     // live pointer while dragging
  const wasPlayingBeforeSeekRef = useRef(false);
  const timelineWidthRef = useRef(0);

  // Interpolation refs for smooth progress while playing
  const lastStatusPosRef = useRef(0);
  const lastStatusTsRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const { getCommentCount } = useComments();
  const commentCount = getCommentCount(reel.id);

  const containerHeight = getContainerHeight(insets);

  // Animations
  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const heartExplosion = useSharedValue(0);
  const musicPulse = useSharedValue(1);
  const playButtonOpacity = useSharedValue(0);

  // Kick off / stop playback when this item becomes active/inactive
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      videoRef.current?.playAsync();

      if (reel.musicInfo) {
        musicPulse.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 800 }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Pause when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.pauseAsync();
          setIsPlaying(false);
        }
      };
    }, [])
  );

  // Smooth progress loop using requestAnimationFrame
  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    // Only interpolate when playing and not seeking
    if (isPlaying && !isSeeking && duration > 0) {
      const now = Date.now();
      const elapsed = now - lastStatusTsRef.current;
      const estimated = lastStatusPosRef.current + elapsed;
      const clamped = Math.min(Math.max(0, estimated), duration);
      setUiPosition(clamped);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stopRaf();
    }
  }, [duration, isPlaying, isSeeking, stopRaf]);

  useEffect(() => {
    if (isPlaying && !isSeeking) {
      // restart loop when we resume play
      stopRaf();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stopRaf();
    }
    return stopRaf;
  }, [isPlaying, isSeeking, tick, stopRaf]);

  // Playback status updates from expo-av
  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsLoading(false);

    const dur = status.durationMillis ?? 0;
    if (dur !== duration) setDuration(dur);

    // Track last "authoritative" position & time
    const pos = status.positionMillis ?? 0;
    lastStatusPosRef.current = pos;
    lastStatusTsRef.current = Date.now();

    // Only let AV updates drive the UI when not seeking
    if (!isSeeking) {
      setUiPosition(pos);
    } else {
      // When seeking is done, sync the position
      console.log('Status update during seeking:', { pos, isSeeking });
    }
  }, [duration, isSeeking]);

  // User interactions
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
    } catch {}
    setIsLiked((prev) => !prev);
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    likeScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onLike(reel.id);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
      heartExplosion.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
    }
  };

  const handleSave = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsSaved((prev) => !prev);
    saveScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onSave(reel.id);
  };

  const handleCommentPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    commentScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    setShowComments(true);
  };

  const handleSharePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    shareScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onShare(reel.id);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
      setIsPlaying(false);
      playButtonOpacity.value = withTiming(1, { duration: 180 });
    } else {
      await videoRef.current?.playAsync();
      setIsPlaying(true);
      playButtonOpacity.value = withTiming(0, { duration: 180 });
    }
  };

  const handleVolumeToggle = () => {
    setIsMuted((m) => !m);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const clampMs = useCallback((ms: number) => {
    if (duration <= 0) return 0;
    return Math.max(0, Math.min(ms, duration));
  }, [duration]);

  const seekTo = useCallback(
    async (ms: number) => {
      if (!videoRef.current || duration <= 0) return;

      const clamped = clampMs(ms);
      console.log('Seeking to:', clamped, 'ms (', formatTime(clamped), ')');

      try {
        // First try the standard seek method
        await videoRef.current.setPositionAsync(clamped);
        console.log('Seek completed to:', clamped, 'ms');
        
        // sync refs/UI immediately
        lastStatusPosRef.current = clamped;
        lastStatusTsRef.current = Date.now();
        setUiPosition(clamped);
      } catch (err) {
        console.log('Standard seek failed, trying fallback...');
        // Fallback method
        try {
          await videoRef.current.playFromPositionAsync(clamped);
          await videoRef.current.pauseAsync();
          lastStatusPosRef.current = clamped;
          lastStatusTsRef.current = Date.now();
          setUiPosition(clamped);
          console.log('Fallback seek completed to:', clamped, 'ms');
        } catch (fallbackErr) {
          console.error('Both seek methods failed:', fallbackErr);
        }
      }
    },
    [clampMs, duration]
  );

  // Timeline width
  const onTimelineLayout = (e: LayoutChangeEvent) => {
    timelineWidthRef.current = e.nativeEvent.layout.width;
  };

  // Tap to seek
  const handleTimelinePress = async (evt: any) => {
    if (duration <= 0) return;
    const width = timelineWidthRef.current || 1;
    const x = Math.max(0, Math.min(evt.nativeEvent.locationX, width));
    const progress = x / width;
    const target = progress * duration;

    wasPlayingBeforeSeekRef.current = isPlaying;
    setIsSeeking(true);
    await videoRef.current?.pauseAsync();
    await seekTo(target);
    if (wasPlayingBeforeSeekRef.current) {
      await videoRef.current?.playAsync();
    }
    setIsSeeking(false);
  };

  // Drag to seek (PanResponder)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: async (evt) => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          if (duration <= 0) return;

          wasPlayingBeforeSeekRef.current = isPlaying;
          setIsSeeking(true);
          await videoRef.current?.pauseAsync();

          const width = timelineWidthRef.current || 1;
          const x = Math.max(0, Math.min(evt.nativeEvent.locationX, width));
          const progress = x / width;
          const newPos = clampMs(progress * duration);
          console.log('Seek start:', { touchX: x, timelineWidth: width, progress, newPosition: newPos, duration });
          setSeekPosition(newPos);
          // Don't update uiPosition during drag to prevent flickering
        },
        onPanResponderMove: (evt) => {
          if (duration <= 0) return;
          const width = timelineWidthRef.current || 1;
          const x = Math.max(0, Math.min(evt.nativeEvent.locationX, width));
          const progress = x / width;
          const newPos = clampMs(progress * duration);
          setSeekPosition(newPos);
          // Don't update uiPosition during drag to prevent flickering
        },
        onPanResponderRelease: async (evt) => {
          if (duration <= 0) return;

          const width = timelineWidthRef.current || 1;
          const x = Math.max(0, Math.min(evt.nativeEvent.locationX, width));
          const progress = x / width;
          const finalPos = clampMs(progress * duration);
          console.log('Seek release:', { touchX: x, timelineWidth: width, progress, finalPosition: finalPos, duration });

          try {
            // do the actual seek
            await seekTo(finalPos);
          } finally {
            // small delay gives AV a breath to land the frame
            setTimeout(async () => {
              if (wasPlayingBeforeSeekRef.current) {
                await videoRef.current?.playAsync();
              }
              setIsSeeking(false);
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch {}
            }, 60);
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          // Gesture cancelled — attempt to resume previous state
          setIsSeeking(false);
          if (wasPlayingBeforeSeekRef.current) {
            videoRef.current?.playAsync();
          }
        },
      }),
    [clampMs, duration, isPlaying, seekTo]
  );

  // Gestures (tap vs double tap)
  const doubleTapGesture = Gesture.Tap().numberOfTaps(2).onStart(() => {
    runOnJS(handleDoubleTap)();
  });
  const singleTapGesture = Gesture.Tap().numberOfTaps(1).onStart(() => {
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
    transform: [{ scale: interpolate(heartExplosion.value, [0, 1], [0.5, 2.5]) }],
  }));
  const musicPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: musicPulse.value }],
  }));
  const playButtonStyle = useAnimatedStyle(() => ({
    opacity: playButtonOpacity.value,
  }));

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMusicPress = () => {
    setShowMusicInfo(true);
    setTimeout(() => setShowMusicInfo(false), 3000);
  };

  useEffect(() => {
    return () => {
      stopRaf();
    };
  }, [stopRaf]);

  return (
    <>
      <View style={[styles.container, { height: containerHeight }]}>
        <GestureDetector gesture={tapGesture}>
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: reel.videoUrl }}
              resizeMode={ResizeMode.COVER}
              isMuted={isMuted}
              isLooping
              // We control playback with play/pause calls; do not rely on shouldPlay toggling each render
              onPlaybackStatusUpdate={onStatus}
              onLoadStart={() => setIsLoading(true)}
              onError={(e) => console.warn('Video error', e)}
            />

            {isLoading && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingSpinner} />
              </View>
            )}

            <Animated.View style={[styles.playButtonOverlay, playButtonStyle]}>
              <View style={styles.playButton}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Animated.View>

            <Animated.View style={[styles.heartExplosion, heartExplosionStyle]}>
              <Heart size={80} color="#6C5CE7" fill="#6C5CE7" />
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Top overlay - Volume */}
        <View style={[styles.topOverlay, Platform.OS === 'ios' && { top: 50 + insets.top }]}>
          <TouchableOpacity style={styles.volumeButton} onPress={handleVolumeToggle}>
            {isMuted ? <VolumeX size={18} color="#FFFFFF" /> : <Volume2 size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {/* Right actions */}
        <View style={styles.rightActions}>
          <Animated.View style={likeAnimatedStyle}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
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
            <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
              <View style={styles.actionIconContainer}>
                <MessageCircle size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={shareAnimatedStyle}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSharePress}>
              <View style={styles.actionIconContainer}>
                <Share2 size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>{formatNumber(reel.shares)}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={saveAnimatedStyle}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
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

        {/* Music info button */}
        {reel.musicInfo && (
          <View style={styles.musicContainer}>
            <TouchableOpacity onPress={handleMusicPress}>
              <Animated.View style={[styles.musicButton, musicPulseStyle]}>
                <Music size={18} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom overlay (user + seek + caption) */}
        <View
          style={[
            styles.bottomOverlay,
            Platform.OS === 'ios' && { height: 160 + insets.bottom, paddingBottom: insets.bottom },
          ]}
        >
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
            style={[
              styles.bottomGradient,
              Platform.OS === 'ios' && { paddingBottom: 100 + insets.bottom },
            ]}
          >
            {/* User */}
            <View style={styles.userInfoContainer}>
              <TouchableOpacity onPress={handleUserPress} style={styles.userInfo}>
                <Image
                  source={{
                    uri:
                      reel?.user?.avatar ||
                      'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.userDetails}>
                  <Text style={styles.username}>@{reel?.user?.username || 'Guest'}</Text>
                  <Text style={styles.timestamp}>{reel?.timestamp || 'Just now'}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Seek bar */}
            <View
              style={[styles.timelineContainer, Platform.OS === 'ios' && styles.timelineContainerIOS]}
              onLayout={onTimelineLayout}
            >
              <View
                style={styles.timelineWrapper}
                // Tap to seek
                onStartShouldSetResponder={() => true}
                onResponderGrant={handleTimelinePress}
                // Drag to seek
                {...panResponder.panHandlers}
              >
                <View style={styles.timelineTrack}>
                  <View
                    style={[
                      styles.timelineProgress,
                      {
                        width:
                          duration > 0
                            ? Math.max(
                                0,
                                Math.min(
                                  (isSeeking ? seekPosition : uiPosition) / duration,
                                  1
                                )
                              ) * (timelineWidthRef.current || 0)
                            : 0,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.timelineThumb,
                      {
                        left:
                          duration > 0
                            ? Math.max(
                                0,
                                Math.min(
                                  (isSeeking ? seekPosition : uiPosition) / duration,
                                  1
                                )
                              ) * (timelineWidthRef.current || 0) - 6
                            : -6,
                      },
                    ]}
                  />
                </View>
                <View style={styles.timeLabels}>
                  <Text style={styles.timeText}>
                    {formatTime(isSeeking ? seekPosition : uiPosition)}
                  </Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>
            </View>

            {/* Caption + hashtags */}
            <View style={styles.captionContainer}>
              <Text style={styles.caption} numberOfLines={2}>
                {reel?.caption || ''}
              </Text>

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

            {/* Music overlay */}
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

      <CommentSystem visible={showComments} onClose={() => setShowComments(false)} postId={reel.id} postType="reel" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
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
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
  },
  loadingSpinner: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 3, borderColor: '#6C5CE7', borderTopColor: 'transparent',
  },
  playButtonOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  playButton: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 2, elevation: 3,
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  actionText: {
    fontSize: 11, color: '#FFFFFF', fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deleteActionButton: { marginTop: 8 },
  deleteIconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B', shadowOpacity: 0.4,
  },
  musicContainer: {
    position: 'absolute',
    bottom: 140,
    right: 16,
  },
  musicButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
  },
  bottomGradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  userInfoContainer: { marginBottom: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18, marginRight: 10,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  userDetails: { flex: 1 },
  username: {
    fontSize: 14, fontWeight: '600', color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timestamp: {
    fontSize: 12, color: '#999999', marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captionContainer: { maxWidth: '75%', marginTop: 4 },
  caption: {
    fontSize: 14, color: '#FFFFFF', lineHeight: 18, marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hashtagScroll: { marginTop: 4 },
  hashtagContainer: { flexDirection: 'row', gap: 6, paddingRight: 20 },
  hashtag: { backgroundColor: '#6C5CE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  hashtagText: { fontSize: 12, color: '#FFFFFF', fontWeight: '500' },
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
  musicText: { fontSize: 12, color: '#FFFFFF', marginLeft: 6, flex: 1, fontWeight: '500' },

  // Timeline
  timelineContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 12,
  },
  timelineContainerIOS: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  timelineWrapper: { width: '100%' },
  timelineTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
    overflow: 'hidden',
  },
  timelineProgress: {
    height: 4,
    backgroundColor: '#6C5CE7',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timelineThumb: {
    width: 12, height: 12, backgroundColor: '#6C5CE7', borderRadius: 6,
    position: 'absolute', top: -4,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  timeLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  timeText: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
});
