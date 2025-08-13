import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react-native';
import { Post } from '../types';
import { useComments } from '../contexts/CommentContext';
import { useUser } from '@/contexts/UserContext';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare?: (postId: string) => void;
}

const { width } = Dimensions.get('window');
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likes);
  const { getCommentCount } = useComments();
  
  const likeScale = useSharedValue(1);
  const heartExplosion = useSharedValue(0);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const trendingGlow = useSharedValue(0);
  const cardScale = useSharedValue(1);

  // Safe guards for missing data
  if (!post || !currentUser || !post.user) {
    return null;
  }
  React.useEffect(() => {
    if (post.isTrending) {
      trendingGlow.value = withTiming(1, { duration: 2000 }, () => {
        trendingGlow.value = withTiming(0, { duration: 2000 });
      });
    }
  }, [post.isTrending]);

  const handleLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
    
    // Heart animation
    likeScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    
    // Heart explosion for new likes
    if (!isLiked) {
      heartExplosion.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
    }
    
    onLike(post.id);
  };

  const handleComment = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    commentScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onComment(post.id);
  };

  const handleShare = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    shareScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onShare?.(post.id);
  };

  const handleUserPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    if (!post?.user?.id || !currentUser?.id) return;
    
    if (post?.user?.id === currentUser?.id) {
      router.push('/(tabs)/profile');
      return;
    }
    router.push({
      pathname: '/ProfileScreen',
      params: { userId: post.user.id }
    });
  };

  const handleImagePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    cardScale.value = withSequence(
      withSpring(0.98, { damping: 15, stiffness: 200 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );
  };

  // Animated styles
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
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

  const trendingAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(trendingGlow.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(trendingGlow.value, [0, 1], [6, 18]),
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const commentCount = getCommentCount(post.id);

  return (
    <Animated.View style={[styles.container, cardAnimatedStyle]}>
      {/* Media Content */}
      <TouchableOpacity activeOpacity={0.95} onPress={handleImagePress}>
        <View style={styles.mediaContainer}>
          {post.image && (
            <Image source={{ uri: post.image }} style={styles.postImage} />
          )}
          
          {/* Trending Badge */}
          {post.isTrending && (
            <Animated.View style={[styles.trendingBadge, trendingAnimatedStyle]}>
              <TrendingUp size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.trendingText}>Trending</Text>
            </Animated.View>
          )}

          {/* Heart explosion */}
          <Animated.View style={[styles.heartExplosion, heartExplosionStyle]}>
            <Heart size={100} color="#E74C3C" fill="#E74C3C" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        <LinearGradient
          colors={['transparent', 'rgba(30, 30, 30, 0.8)', '#1E1E1E']}
          style={styles.gradientOverlay}
        >
          {/* User Info - Bottom Left */}
          <View style={styles.userSection}>
            <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
              <Image 
                source={{ 
                  uri: post?.user?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'
                }} 
                style={styles.avatar} 
              />
              <View style={styles.userDetails}>
                <Text style={styles.username}>@{post?.user?.username ?? 'Guest'}</Text>
                <Text style={styles.timestamp}>{post?.timestamp ?? 'Just now'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBar}>
            <View style={styles.leftActions}>
              <Animated.View style={likeAnimatedStyle}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleLike}
                >
                  <View style={styles.actionIconContainer}>
                    <Heart
                      size={24}
                      color={isLiked ? '#E74C3C' : '#FFFFFF'}
                      fill={isLiked ? '#E74C3C' : 'transparent'}
                      strokeWidth={2}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={commentAnimatedStyle}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleComment}
                >
                  <View style={styles.actionIconContainer}>
                    <MessageCircle size={24} color="#FFFFFF" strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={shareAnimatedStyle}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <View style={styles.actionIconContainer}>
                    <Share2 size={24} color="#FFFFFF" strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Engagement Info */}
          <View style={styles.engagementSection}>
            <Text style={[styles.likesText, isLiked && styles.likedText]}>
              {likes.toLocaleString()} likes
            </Text>
          </View>

          {/* Caption */}
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>
              <Text style={styles.captionUsername}>@{post?.user?.username ?? 'Guest'}</Text>
              <Text style={styles.captionText}> {post?.content ?? ''}</Text>
            </Text>
          </View>

          {/* Comments */}
          <TouchableOpacity onPress={handleComment} style={styles.commentsContainer}>
            <Text style={styles.viewComments}>
              {commentCount > 0 ? `View all ${commentCount} comments` : 'Add a comment...'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mediaContainer: {
    position: 'relative',
    width: width,
    height: width,
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trendingText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heartExplosion: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userSection: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timestamp: {
    fontSize: 13,
    color: '#E0E0E0',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  engagementSection: {
    marginBottom: 8,
  },
  likesText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  likedText: {
    color: '#6C5CE7',
  },
  captionContainer: {
    marginBottom: 8,
  },
  caption: {
    fontSize: 15,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionUsername: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  captionText: {
    color: '#E0E0E0',
    fontWeight: '400',
  },
  commentsContainer: {
    paddingVertical: 4,
  },
  viewComments: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});