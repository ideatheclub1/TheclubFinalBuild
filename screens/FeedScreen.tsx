import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  ImageBackground,
} from 'react-native';
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
import { Heart, MessageCircle, Share2, Play, TrendingUp, Eye, Clock } from 'lucide-react-native';
import { Post, Story } from '../types';
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
    setIsRefreshing(false);
  }, []);

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

    const handlePostLike = () => {
      setIsLiked(!isLiked);
      setLikes(isLiked ? likes - 1 : likes + 1);
      
      // Heart animation with bounce
      likeScale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1, { damping: 8 })
      );
      
      handleLike(post.id);
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
                source={{ uri: post.image }} 
                style={styles.postImage}
                imageStyle={styles.postImageStyle}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(30, 30, 30, 0.7)']}
                  style={styles.imageGradient}
                />
                
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
                    onPress={() => handleUserPress(post.user.id)} 
                    style={styles.userInfo}
                  >
                    <Image source={{ uri: post.user.avatar }} style={styles.userAvatar} />
                    <View style={styles.userDetails}>
                      <Text style={styles.username}>@{post.user.username}</Text>
                      <Text style={styles.timestamp}>{post.timestamp}</Text>
                    </View>
                  </TouchableOpacity>
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
          <Text style={[styles.likesText, isLiked && styles.likedText]}>
            {likes.toLocaleString()} likes
          </Text>

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
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#1E1E1E" 
        translucent={Platform.OS === 'android'}
      />
      
      <Header />
      
      <FlatList<Post>
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
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
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        getItemLayout={(data, index) => ({
          length: width + 100, // Approximate item height
          offset: (width + 100) * index,
          index,
        })}
      />

      {/* Comment System */}
      <CommentSystem
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={selectedPostId}
        postType="feed"
      />
    </SafeAreaView>
  );
};

export default function FeedScreen() {
  return (
    <SwipeContainer>
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
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
});