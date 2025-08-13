import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  ImageBackground,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  withSequence,
  withRepeat,
  runOnJS,
  FadeIn,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, Share2, Play, TrendingUp, Eye, Clock, X, Users, MoreVertical, Trash2 } from 'lucide-react-native';
import { Post, Story, User } from '../types';
import { useComments } from '../contexts/CommentContext';
import { useUser } from '../contexts/UserContext';
import { dataService } from '../services/dataService';
import StoryCarousel from '../components/StoryCarousel';
import CommentSystem from '../components/CommentSystem';
import SwipeContainer from '../components/SwipeContainer';
import { debug, useDebugLogger } from '@/utils/debugLogger';

const { width, height } = Dimensions.get('window');
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

// Mock shorts data with enhanced details
const mockShorts = [
  {
    id: 's1',
    thumbnail: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: '0:45',
    views: '2.1M',
    title: 'Night City Vibes',
    isNew: true,
    creator: 'luna_mystic',
  },
  {
    id: 's2',
    thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: '1:12',
    views: '856K',
    title: 'Creative Process',
    isNew: false,
    creator: 'neon_dreamer',
  },
  {
    id: 's3',
    thumbnail: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: '0:28',
    views: '1.5M',
    title: 'Purple Dreams',
    isNew: true,
    creator: 'purple_vibes',
  },
  {
    id: 's4',
    thumbnail: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: '0:55',
    views: '923K',
    title: 'Aesthetic Mood',
    isNew: false,
    creator: 'cosmic_soul',
  },
  {
    id: 's5',
    thumbnail: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: '1:33',
    views: '3.2M',
    title: 'AI Revolution',
    isNew: true,
    creator: 'cyber_punk',
  },
];

const FeedScreenContent = () => {
  const debugLogger = useDebugLogger('FeedScreen');
  const router = useRouter();

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Feed screen loaded');
  }, []);
  const { user: currentUser } = useUser();
  
  // Log page load
  debug.pageLoad('FeedScreen', { currentUserId: currentUser?.id });
  const { getCommentCount } = useComments();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const flatListRef = useRef<FlatList<Post>>(null);
  
  // Likes modal state
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [selectedPostForLikes, setSelectedPostForLikes] = useState<Post | null>(null);
  const [likesUsers, setLikesUsers] = useState<User[]>([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  
  // Animation values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const headerGlow = useSharedValue(0);

  // Load data from database
  useEffect(() => {
    loadData();
  }, []);

  // Initialize animations
  useEffect(() => {
    // Header glow animation
    headerGlow.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const loadData = async () => {
    try {
      debug.dbQuery('feed_data', 'LOAD', { type: 'posts_and_stories' });
      setIsLoading(true);
      const [postsData, storiesData] = await Promise.all([
        dataService.post.getPosts(),
        dataService.story.getStories(),
      ]);
      
      // Debug: Log posts with image information
      postsData.forEach((post, index) => {
        debugLogger.info('Post loaded', `Post ${index + 1}: ID=${post.id}, HasImage=${!!post.image}, ImageUrl=${post.image || 'null'}`);
      });
      
      debug.dbSuccess('posts', 'LOAD', { count: postsData.length });
      debug.dbSuccess('stories', 'LOAD', { count: storiesData.length });
      setPosts(postsData);
      setStories(storiesData);
    } catch (error) {
      debug.dbError('feed_data', 'LOAD', { error: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Header fade effect based on scroll
      headerOpacity.value = interpolate(
        scrollY.value,
        [0, 100, 200],
        [1, 0.9, 0.7],
        'clamp'
      );
    },
  });

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.value = offsetY;
    
    // Header fade effect based on scroll
    headerOpacity.value = interpolate(
      offsetY,
      [0, 100, 200],
      [1, 0.9, 0.7],
      'clamp'
    );
  };

  const handleRefresh = useCallback(async () => {
    debug.userAction('Pull to refresh triggered');
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      debugLogger.error('Haptics error during refresh', (error as Error).message);
    }
    
    await loadData();
    debug.userAction('Pull to refresh completed');
  }, []);

  // Handle showing likes for a post
  const handleShowLikes = async (post: Post) => {
    try {
      debug.userAction('Show likes', { postId: post.id });
      setIsLoadingLikes(true);
      setSelectedPostForLikes(post);
      setShowLikesModal(true);
      
      const users = await dataService.post.getPostLikes(post.id, currentUser?.id);
      setLikesUsers(users);
      debug.userAction('Likes loaded', { count: users.length });
    } catch (error) {
      debugLogger.error('Failed to load likes', (error as Error).message);
    } finally {
      setIsLoadingLikes(false);
    }
  };

  const handleCloseLikesModal = () => {
    setShowLikesModal(false);
    setSelectedPostForLikes(null);
    setLikesUsers([]);
  };



  const handleLike = useCallback(async (postId: string) => {
    debug.userAction('Like post', { postId });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      debugLogger.error('Haptics error during like', (error as Error).message);
    }
    
    if (!currentUser) {
      debug.userAction('No current user, skipping like action');
      return;
    }
    
    const success = await dataService.post.togglePostLike(currentUser.id, postId);
    if (success) {
      debug.userAction('Post like toggled successfully', { postId, userId: currentUser.id });
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post
        )
      );
    } else {
      debugLogger.error('Failed to toggle post like', `PostId: ${postId}, UserId: ${currentUser.id}`);
    }
  }, [currentUser]);

  const handleComment = useCallback((postId: string) => {
    debug.userAction('Comment button pressed', { postId });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      debugLogger.error('Haptics error during comment', (error as Error).message);
    }
    setSelectedPostId(postId);
    setShowComments(true);
  }, []);

  const handleShare = useCallback((postId: string) => {
    debug.userAction('Share button pressed', { postId });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      debugLogger.error('Haptics error during share', (error as Error).message);
    }
    // Share functionality would be implemented here
  }, []);

  const handleDeletePost = useCallback((postId: string, postUsername: string) => {
    debug.userAction('Delete post pressed', { postId });
    
    if (!currentUser) {
      debug.userAction('No current user, skipping delete action');
      return;
    }

    Alert.alert(
      '🗑️ Delete Post',
      `Are you sure you want to delete this post?\n\nThis action cannot be undone and will permanently remove the post and all associated comments and likes.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => debug.userAction('Delete post cancelled', { postId })
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              debug.userAction('Confirming delete post', { postId, userId: currentUser.id });
              
              const success = await dataService.post.deletePost(postId, currentUser.id);
              if (success) {
                debug.userAction('Post deleted successfully', { postId });
                // Remove post from local state
                setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
                
                Alert.alert(
                  '✅ Success', 
                  'Post has been deleted successfully!',
                  [{ text: 'OK', style: 'default' }]
                );
                
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (error) {
                  debugLogger.error('Haptics error during delete confirmation', (error as Error).message);
                }
              } else {
                debug.userAction('Failed to delete post', { postId });
                Alert.alert(
                  '❌ Error', 
                  'Failed to delete post. Please check your connection and try again.',
                  [{ text: 'OK', style: 'default' }]
                );
              }
            } catch (error) {
              debugLogger.error('Error deleting post', (error as Error).message);
              Alert.alert(
                '❌ Error', 
                'An unexpected error occurred while deleting the post. Please try again.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          }
        }
      ],
      { cancelable: true }
    );
  }, [currentUser]);

  const handleStoryPress = useCallback((story: Story) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    // Story viewer would open here
  }, []);

  const handleAddStory = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    router.push('/(tabs)/create');
  }, [router]);

  const handleMessagesPress = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    router.push('/(tabs)/messages');
  }, [router]);

  const handleUserPress = useCallback((userId: string) => {
    if (!userId || !currentUser?.id) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    if (userId === currentUser.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({
        pathname: '/ProfileScreen',
        params: { userId }
      });
    }
  }, [router, currentUser?.id]);

  const handleShortsPress = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    router.push('/(tabs)/reels');
  }, [router]);

  // Header component with smooth animations
  const Header = () => {
    const headerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: headerOpacity.value,
    }));

    const logoGlowStyle = useAnimatedStyle(() => ({
      shadowOpacity: interpolate(headerGlow.value, [0, 1], [0.4, 0.8]),
      shadowRadius: interpolate(headerGlow.value, [0, 1], [12, 20]),
    }));

    const messageButtonScale = useSharedValue(1);

    const handleMessagePress = () => {
      messageButtonScale.value = withSequence(
        withSpring(0.9, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );
      handleMessagesPress();
    };

    const messageButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: messageButtonScale.value }],
    }));

    return (
      <Animated.View 
        entering={FadeInDown.duration(800)}
      >
        <Animated.View 
          style={[styles.header, headerAnimatedStyle]}
        >
        <BlurView intensity={Platform.OS === 'ios' ? 20 : 0} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <Animated.View style={[styles.logoContainer, logoGlowStyle]}>
              <Text style={styles.logoEmoji}>💜</Text>
              <Text style={styles.logoText}>The Club</Text>
            </Animated.View>
            
            <AnimatedTouchableOpacity 
              onPress={handleMessagePress} 
              style={[styles.messageButton, messageButtonStyle]}
            >
              <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
              <Animated.View 
                style={styles.messageBadge}
                entering={FadeIn.delay(1000)}
              >
                <Text style={styles.badgeText}>2</Text>
              </Animated.View>
            </AnimatedTouchableOpacity>
          </View>
        </BlurView>
        </Animated.View>
      </Animated.View>
    );
  };

  // Enhanced Post component with smooth animations
  const PostItem = ({ post, index }: { post: Post; index: number }) => {
    const likeScale = useSharedValue(1);
    const commentScale = useSharedValue(1);
    const shareScale = useSharedValue(1);
    const cardScale = useSharedValue(1);
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likes, setLikes] = useState(post.likes);
    const [isLoadingLikes, setIsLoadingLikes] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // Load actual likes count
    useEffect(() => {
      const loadLikesCount = async () => {
        try {
          setIsLoadingLikes(true);
          const likesCount = await dataService.post.getPostLikesCount(post.id);
          setLikes(likesCount);
        } catch (error) {
          console.error('Error loading likes count:', error);
        } finally {
          setIsLoadingLikes(false);
        }
      };

      loadLikesCount();
    }, [post.id]);

    const handlePostLike = async () => {
      setIsLiked(!isLiked);
      
      // Heart animation with bounce
      likeScale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1, { damping: 8 })
      );
      
      // Call the like function
      handleLike(post.id);
      
      // Update likes count after a short delay
      setTimeout(async () => {
        const newLikesCount = await dataService.post.getPostLikesCount(post.id);
        setLikes(newLikesCount);
      }, 500);
    };

    const handlePostComment = () => {
      commentScale.value = withSequence(
        withSpring(1.1, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );
      handleComment(post.id);
    };

    const handlePostShare = () => {
      shareScale.value = withSequence(
        withSpring(1.1, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );
      handleShare(post.id);
    };

    const handleCardPress = () => {
      cardScale.value = withSequence(
        withSpring(0.98, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );
    };

    const likeAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: likeScale.value }],
    }));

    const commentAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: commentScale.value }],
    }));

    const shareAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: shareScale.value }],
    }));

    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
    }));

    const commentCount = getCommentCount(post.id);

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).springify()}
      >
        <Animated.View 
          style={[styles.postCard, cardAnimatedStyle]}
        >
        <TouchableOpacity 
          activeOpacity={0.95} 
          onPress={handleCardPress}
        >
          <View style={styles.mediaContainer}>
            {post.image && (
              <AnimatedImageBackground
                source={{ 
                  uri: imageError 
                    ? 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400'
                    : post.image 
                }}
                onError={(error) => {
                  setImageError(true);
                  setImageLoading(false);
                  debugLogger.error('Image load error', `Failed to load image for post ${post.id}: ${post.image}. Using fallback image.`);
                  console.error('Image load error:', error);
                }}
                onLoad={() => {
                  setImageLoading(false);
                  if (!imageError) {
                    debugLogger.info('Image loaded', `Successfully loaded image for post ${post.id}: ${post.image}`);
                  }
                }}
                onLoadStart={() => {
                  setImageLoading(true);
                }}
                style={styles.postImage}
                imageStyle={styles.postImageStyle}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(30, 30, 30, 0.7)']}
                  style={styles.imageGradient}
                />

                {/* Loading Indicator */}
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color="#6C5CE7" />
                    <Text style={styles.imageLoadingText}>Loading image...</Text>
                  </View>
                )}

                {/* Error Message */}
                {imageError && (
                  <View style={styles.imageErrorOverlay}>
                    <Text style={styles.errorText}>📷 Image unavailable</Text>
                    <Text style={styles.errorSubtext}>Using placeholder</Text>
                  </View>
                )}
                
                {/* Trending Badge */}
                {post.isTrending && (
                  <Animated.View 
                    style={styles.trendingBadge}
                    entering={SlideInRight.delay(500)}
                  >
                    <TrendingUp size={12} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.trendingText}>Trending</Text>
                  </Animated.View>
                )}
                
                {/* User Info Overlay */}
                <View style={styles.userOverlay}>
                  <TouchableOpacity 
                    onPress={() => post.user?.id && handleUserPress(post.user.id)} 
                    style={styles.userInfo}
                  >
                    <Image source={{ uri: post.user?.avatar || 'https://via.placeholder.com/150' }} style={styles.userAvatar} />
                    <View style={styles.userDetails}>
                      <Text style={styles.username}>@{post.user?.username || 'Unknown User'}</Text>
                      <Text style={styles.timestamp}>{post.timestamp}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Delete Button - Only show for post owner */}
                  {currentUser && post.user?.id && post.user.id === currentUser.id && (
                    <TouchableOpacity
                      onPress={() => handleDeletePost(post.id, post.user?.username || 'Unknown User')}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={18} color="#FF6B6B" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </AnimatedImageBackground>
            )}
          </View>
        </TouchableOpacity>

        {/* Post Content */}
        <View style={styles.postContent}>
          {/* Actions */}
          <View style={styles.actionsRow}>
            <AnimatedTouchableOpacity
              style={[styles.actionButton, likeAnimatedStyle]}
              onPress={handlePostLike}
            >
              <View style={[styles.actionIconContainer, isLiked && styles.likedIconContainer]}>
                <Heart
                  size={20}
                  color={isLiked ? '#FFFFFF' : '#E0E0E0'}
                  fill={isLiked ? '#FFFFFF' : 'transparent'}
                  strokeWidth={2}
                />
              </View>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.actionButton, commentAnimatedStyle]}
              onPress={handlePostComment}
            >
              <View style={styles.actionIconContainer}>
                <MessageCircle size={20} color="#E0E0E0" strokeWidth={2} />
              </View>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.actionButton, shareAnimatedStyle]}
              onPress={handlePostShare}
            >
              <View style={styles.actionIconContainer}>
                <Share2 size={20} color="#E0E0E0" strokeWidth={2} />
              </View>
            </AnimatedTouchableOpacity>
          </View>

          {/* Like Count */}
          <TouchableOpacity 
            onPress={() => handleShowLikes(post)}
            style={styles.likesContainer}
          >
            <Text style={[styles.likesText, isLiked && styles.likedText]}>
              {isLoadingLikes ? 'Loading...' : `${likes.toLocaleString()} likes`}
            </Text>
          </TouchableOpacity>

          {/* Caption */}
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>
              <Text style={styles.captionUsername}>@{post.user.username}</Text>
              <Text style={styles.captionText}> {post.content}</Text>
            </Text>
          </View>

          {/* Comments */}
          <TouchableOpacity onPress={handlePostComment}>
            <Text style={styles.viewComments}>
              {commentCount > 0 ? `View all ${commentCount} comments` : 'Add a comment...'}
            </Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </Animated.View>
    );
  };

  // Enhanced Shorts section with animations
  const ShortsSection = () => {
    const shortScale = useSharedValue(1);

    const handleShortPress = (shortId: string) => {
      shortScale.value = withSequence(
        withSpring(0.95, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );
      handleShortsPress();
    };

    return (
      <Animated.View 
        style={styles.shortsSection}
        entering={FadeInDown.delay(300).springify()}
      >
        <View style={styles.shortsHeader}>
          <View style={styles.shortsTitle}>
            <Play size={20} color="#E74C3C" fill="#E74C3C" />
            <Text style={styles.shortsTitleText}>Shorts</Text>
          </View>
          <TouchableOpacity onPress={handleShortsPress}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortsScrollContainer}
          snapToInterval={166}
          decelerationRate="fast"
          snapToAlignment="start"
        >
          {mockShorts.map((short, index) => {
            const itemScale = useSharedValue(1);
            
            const handlePress = () => {
              itemScale.value = withSequence(
                withSpring(0.95, { damping: 12 }),
                withSpring(1, { damping: 12 })
              );
              runOnJS(handleShortPress)(short.id);
            };

            const animatedStyle = useAnimatedStyle(() => ({
              transform: [{ scale: itemScale.value }],
            }));

            return (
              <AnimatedTouchableOpacity
                key={short.id}
                style={[styles.shortCard, animatedStyle]}
                onPress={handlePress}
                entering={SlideInRight.delay(index * 100)}
              >
                <ImageBackground
                  source={{ uri: short.thumbnail }}
                  style={styles.shortThumbnail}
                  imageStyle={styles.shortImageStyle}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
                    style={styles.shortGradient}
                  >
                    {/* New Badge */}
                    {short.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newText}>NEW</Text>
                      </View>
                    )}
                    
                    {/* Play Icon */}
                    <View style={styles.playIcon}>
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                    
                    {/* Video Info */}
                    <View style={styles.shortInfo}>
                      <View style={styles.shortMetrics}>
                        <View style={styles.metricItem}>
                          <Clock size={10} color="#FFFFFF" />
                          <Text style={styles.shortDuration}>{short.duration}</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Eye size={10} color="#FFFFFF" />
                          <Text style={styles.shortViews}>{short.views}</Text>
                        </View>
                      </View>
                      <Text style={styles.shortTitle} numberOfLines={1}>
                        {short.title}
                      </Text>
                      <Text style={styles.shortCreator} numberOfLines={1}>
                        @{short.creator}
                      </Text>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </AnimatedTouchableOpacity>
            );
          })}
          
          {/* Spacer for showing half of next item */}
          <View style={styles.shortsSpacer} />
        </ScrollView>
      </Animated.View>
    );
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    // Insert shorts section after 2nd post
    if (index === 2) {
      return (
        <View key={`shorts-${index}`}>
          <ShortsSection />
          <PostItem post={item} index={index} />
        </View>
      );
    }
    return <PostItem post={item} index={index} />;
  };

  // Check authentication and redirect if needed
  const { checkAuthAndRedirect } = useUser();
  
  useEffect(() => {
    checkAuthAndRedirect();
  }, [checkAuthAndRedirect]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Don't render if no user data
  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Please log in...</Text>
      </View>
    );
  }

  return (
    <SafeAreaWrapper style={styles.container} backgroundColor="#1E1E1E">
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#1E1E1E" 
        translucent={Platform.OS === 'android'}
      />
      
      <Header />
      
      <FlatList<Post>
        ref={flatListRef}
        data={posts.filter(item => item && item.id)}
        renderItem={renderPost}
        keyExtractor={(item) => item?.id || `post-${Math.random()}`}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
            progressBackgroundColor="#1E1E1E"
            colors={['#6C5CE7']}
          />
        }
        ListHeaderComponent={
          <StoryCarousel
            stories={stories}
            onAddStory={handleAddStory}
            onStoryPress={handleStoryPress}
          />
        }
        contentContainerStyle={styles.feedContent}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />

      {/* Comment System */}
      <CommentSystem
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={selectedPostId}
        postType="feed"
      />

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseLikesModal}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={styles.likesModalContainer}
            entering={FadeInDown.duration(300).springify().damping(20).stiffness(100)}
            exiting={FadeInDown.duration(300).springify().damping(20).stiffness(100)}
          >
            {/* Header */}
            <View style={styles.likesModalHeader}>
              <Text style={styles.likesModalTitle}>
                {selectedPostForLikes?.user.username}'s post
              </Text>
              <TouchableOpacity 
                onPress={handleCloseLikesModal}
                style={styles.closeButton}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.likesModalContent}>
              {isLoadingLikes ? (
                <View style={styles.loadingLikesContainer}>
                  <ActivityIndicator size="large" color="#6C5CE7" />
                  <Text style={styles.loadingLikesText}>Loading likes...</Text>
                </View>
              ) : likesUsers.length > 0 ? (
                <FlatList
                  data={likesUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item: user }) => (
                    <TouchableOpacity 
                      style={styles.likesUserItem}
                      onPress={() => {
                        handleCloseLikesModal();
                        handleUserPress(user.id);
                      }}
                    >
                      <Image source={{ uri: user.avatar }} style={styles.likesUserAvatar} />
                      <View style={styles.likesUserInfo}>
                        <Text style={styles.likesUsername}>@{user.username}</Text>
                        {user.bio && (
                          <Text style={styles.likesUserBio} numberOfLines={1}>
                            {user.bio}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews={false}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={5}
                />
              ) : (
                <View style={styles.noLikesContainer}>
                  <Users size={48} color="#666666" />
                  <Text style={styles.noLikesText}>No likes yet</Text>
                  <Text style={styles.noLikesSubtext}>Be the first to like this post!</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

export default function FeedScreen() {
  return (
    <SwipeContainer disableGestures={true}>
      <FeedScreenContent />
    </SwipeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  header: {
    backgroundColor: '#1E1E1E',
    zIndex: 1000,
  },
  headerBlur: {
    backgroundColor: Platform.OS === 'android' ? '#1E1E1E' : 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6C5CE7',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  messageButton: {
    position: 'relative',
    padding: 10,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1E1E1E',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  feedContent: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#1E1E1E',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    marginHorizontal: 4,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: width,
  },
  postImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  postImageStyle: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  } as any,
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  trendingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  userOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  } as any,
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  timestamp: {
    fontSize: 13,
    color: '#E0E0E0',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  postContent: {
    padding: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  likedIconContainer: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
    shadowColor: '#E74C3C',
    shadowOpacity: 0.4,
  },
  likesText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  likesContainer: {
    marginBottom: 12,
  },
  likedText: {
    color: '#E74C3C',
  },
  captionContainer: {
    marginBottom: 12,
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  captionUsername: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  captionText: {
    color: '#E0E0E0',
    fontWeight: '400',
  },
  viewComments: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  shortsSection: {
    backgroundColor: '#2A2A2A',
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  shortsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  shortsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortsTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  shortsScrollContainer: {
    paddingRight: 20,
    gap: 12,
  },
  shortCard: {
    width: 150,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  shortThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  shortImageStyle: {
    borderRadius: 16,
  },
  shortGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 12,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  newText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  playIcon: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  shortInfo: {
    alignSelf: 'stretch',
  },
  shortMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shortDuration: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  shortViews: {
    fontSize: 11,
    color: '#E0E0E0',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  shortTitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  shortCreator: {
    fontSize: 12,
    color: '#E0E0E0',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  shortsSpacer: {
    width: 20, // Half visible next item
  },
  // Likes Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Safe area for iOS
  },
  likesModalContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Platform.OS === 'ios' ? '85%' : '80%',
    minHeight: Platform.OS === 'ios' ? 300 : 250,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: Platform.OS === 'ios' ? 8 : 0, // Add margin on iOS
  },
  likesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  likesModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  likesModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingLikesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingLikesText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  likesUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  likesUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  likesUserInfo: {
    flex: 1,
  },
  likesUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  likesUserBio: {
    fontSize: 14,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  noLikesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noLikesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  noLikesSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  
  // Image loading and error styles
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  imageLoadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  errorSubtext: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});