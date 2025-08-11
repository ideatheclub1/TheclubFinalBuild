import React, { useState, useRef } from 'react';
import { Button } from 'react-native'; // You can use your own styled button if you wish
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Share2, Settings, Grid2x2 as Grid, Camera, UserPlus, UserMinus, MessageCircle, Crown, DollarSign, Shield, MapPin, Clock, CreditCard as Edit3, Home as Home, TrendingUp, ArrowRight, ArrowLeft, Flag, Bell, Heart, UserCheck, Clock3, X, ChevronLeft, ChevronRight, Trophy, Upload, Users, Award } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Post, User } from '../types';
import FullScreenPostViewer from '../components/FullScreenPostViewer';
import BulletinBoardSection from '../components/BulletinBoardSection';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import ReviewsSection from '@/components/ReviewsSection';
import { handleBackNavigation } from '@/utils/navigation';
import { debug, useDebugLogger } from '@/utils/debugLogger';

/**
 * ProfileScreen Data Sources:
 * 
 * FROM SERVER:
 * - User profile data (name, bio, location, age, etc.)
 * - User posts
 * - Follow status
 * - Host status
 * 
 * PLACEHOLDERS (TODO: Implement on server):
 * - Follower/Following counts
 * - Cover image
 * - Notification counts
 * - Rating/reviews
 * - Host-specific data (hourly rate, etc.)
 */

const { width, height } = Dimensions.get('window');
const imageSize = (width - 56) / 3;
const HEADER_HEIGHT = 100;
const PROFILE_IMAGE_SIZE = 120;

interface ProfileScreenProps {
  route?: {
    params?: {
      userId?: string;
    };
  };
}

export default function ProfileScreen({ route }: ProfileScreenProps) {
  const router = useRouter();
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const params = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('ProfileScreen');
  
  const userId = route?.params?.userId || params?.userId || 'me';
  const actualUserId = userId === 'me' ? (currentUser?.id || '') : userId;
  const isCurrentUser = actualUserId === currentUser?.id;
  
  // Log page load
  debug.pageLoad('ProfileScreen', { userId, actualUserId, isCurrentUser });
  
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFullScreenPost, setShowFullScreenPost] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  // TODO: Replace with actual cover image from server
  const [coverImage, setCoverImage] = useState('https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=800');

  // Animation values
  const scrollY = useSharedValue(0);
  const profileGlow = useSharedValue(0);
  const buttonPulse = useSharedValue(0);
  const coverFade = useSharedValue(1);
  const notificationBounce = useSharedValue(0);
  const hostButtonScale = useSharedValue(1);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user data and posts
  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // If it's the current user, use their data
        if (isCurrentUser && currentUser) {
          debugLogger.log('USING_CURRENT_USER', `Using current user data: ${currentUser.id}`);
          setUser(currentUser);
          setIsFollowing(false); // Current user can't follow themselves
        } else if (actualUserId && actualUserId !== '') {
          // Fetch user profile from server
          debugLogger.process('FETCHING_USER_PROFILE', `Fetching user profile for: ${actualUserId}`);
          const userProfile = await dataService.user.getUserProfile(actualUserId);
          if (userProfile) {
            debugLogger.success('USER_PROFILE_FETCHED', `User profile fetched successfully`, { userId: actualUserId, userName: userProfile.fullName });
            setUser(userProfile);
            
            // Check follow status if current user is logged in
            if (currentUser) {
              try {
                const followStatus = await dataService.user.checkFollowStatus(currentUser.id, actualUserId);
                debugLogger.log('FOLLOW_STATUS_CHECKED', `Follow status checked`, { currentUserId: currentUser.id, targetUserId: actualUserId, isFollowing: followStatus });
                setIsFollowing(followStatus);
              } catch (error) {
                debugLogger.error('FOLLOW_STATUS_ERROR', 'Could not check follow status', error);
                setIsFollowing(false);
              }
            }
          } else {
            debugLogger.error('USER_PROFILE_FAILED', `Failed to fetch user profile for: ${actualUserId}`);
            setError('User not found');
          }
        } else {
          debugLogger.error('NO_USER_ID', 'No user ID available');
          setError('No user ID available');
        }

        // Fetch user posts only if we have a valid user ID
        if (actualUserId && actualUserId !== '') {
          debugLogger.process('FETCHING_USER_POSTS', `Fetching posts for user: ${actualUserId}`);
          const posts = await dataService.post.getPostsByUser(actualUserId);
          debugLogger.success('USER_POSTS_FETCHED', `Posts fetched successfully`, { userId: actualUserId, postCount: posts.length });
          setUserPosts(posts);
        } else {
          debugLogger.log('NO_POSTS_FETCH', 'No user ID available for posts fetch');
          setUserPosts([]);
        }

      } catch (err) {
        debugLogger.error('USER_DATA_ERROR', 'Error fetching user data', err);
        setError('Failed to load user data');
      } finally {
        debugLogger.log('USER_DATA_COMPLETE', 'User data fetching completed');
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [actualUserId, isCurrentUser, currentUser]);

  React.useEffect(() => {
    // Subtle glow animation for premium users
    if (user?.isHost) {
      profileGlow.value = withRepeat(
        withTiming(1, { duration: 4000 }),
        -1,
        true
      );
    }
    
    // Subtle button pulse
    buttonPulse.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );

    // Notification bounce when there are unread notifications
    // TODO: Replace with actual notification count from server
    const unreadCount = 2; // Placeholder unread count
    if (unreadCount > 0) {
      notificationBounce.value = withRepeat(
        withSpring(1, { damping: 8 }),
        -1,
        true
      );
    }
  }, [user?.isHost]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.value = offsetY;
  };

  const handleFollow = async () => {
    if (!user || !currentUser) return;
    
    try {
      debugLogger.log('FOLLOW_ACTION', `Attempting to ${isFollowing ? 'unfollow' : 'follow'} user`, { 
        currentUserId: currentUser.id, 
        targetUserId: user.id 
      });
      
      // Get current follower count before the action
      const beforeCounts = await dataService.user.testFollowerCounts(user.id);
      debugLogger.log('BEFORE_FOLLOW_ACTION', 'Follower counts before action', beforeCounts);
      
      if (isFollowing) {
        await dataService.user.unfollowUser(currentUser.id, user.id);
        debugLogger.success('UNFOLLOW_SUCCESS', `Successfully unfollowed user`, { targetUserId: user.id });
      } else {
        await dataService.user.followUser(currentUser.id, user.id);
        debugLogger.success('FOLLOW_SUCCESS', `Successfully followed user`, { targetUserId: user.id });
      }
      
      // Update follow status
      setIsFollowing(!isFollowing);
      
      // Wait a moment for database triggers to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh user data to get updated follower count from database
      if (!isCurrentUser) {
        debugLogger.log('REFRESHING_USER_DATA', 'Refreshing user data to get updated follower count');
        try {
          // Test the follower counts first
          const afterCounts = await dataService.user.testFollowerCounts(user.id);
          debugLogger.log('AFTER_FOLLOW_ACTION', 'Follower counts after action', afterCounts);
          
          // Check if counts actually changed
          if (afterCounts.followersCount !== beforeCounts.followersCount) {
            debugLogger.success('FOLLOWER_COUNT_UPDATED', 'Follower count updated in database', {
              before: beforeCounts.followersCount,
              after: afterCounts.followersCount
            });
          } else {
            debugLogger.log('FOLLOWER_COUNT_NOT_UPDATED', 'Follower count not updated in database, trying manual update', {
              before: beforeCounts.followersCount,
              after: afterCounts.followersCount
            });
            
            // Try manual update as fallback
            try {
              const manualCounts = await dataService.user.updateFollowerCountsManually(user.id);
              debugLogger.log('MANUAL_UPDATE_RESULT', 'Manual update completed', manualCounts);
              
              if (manualCounts.followersCount !== beforeCounts.followersCount) {
                debugLogger.success('MANUAL_UPDATE_SUCCESS', 'Manual update successful', {
                  before: beforeCounts.followersCount,
                  after: manualCounts.followersCount
                });
              }
            } catch (manualError) {
              debugLogger.error('MANUAL_UPDATE_FAILED', 'Manual update failed', manualError);
            }
          }
          
          const updatedUserProfile = await dataService.user.getUserProfile(user.id);
          if (updatedUserProfile) {
            debugLogger.log('UPDATED_USER_PROFILE', 'Got updated user profile', {
              newFollowersCount: updatedUserProfile.followersCount,
              newFollowingCount: updatedUserProfile.followingCount
            });
            
            setUser(updatedUserProfile);
            debugLogger.success('USER_DATA_REFRESHED', 'User data refreshed successfully', { 
              newFollowersCount: updatedUserProfile.followersCount,
              testCounts: afterCounts
            });
          } else {
            debugLogger.error('USER_PROFILE_FETCH_FAILED', 'Failed to fetch updated user profile');
          }
        } catch (refreshError) {
          debugLogger.error('USER_DATA_REFRESH_ERROR', 'Failed to refresh user data', refreshError);
        }
      }
      
    } catch (error) {
      debugLogger.error('FOLLOW_ERROR', 'Error toggling follow status', error);
      console.error('Error toggling follow status:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing functionality would open here');
  };

  const handleMessages = () => {
    router.push('/(tabs)/messages');
  };

  const handlePostPress = (post: Post) => {
    const postIndex = userPosts.findIndex(p => p.id === post.id);
    setSelectedPostIndex(postIndex);
    setShowFullScreenPost(true);
  };

  const handleLike = (postId: string) => {
    setUserPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1
            }
          : post
      )
    );
  };

  const handleComment = (postId: string) => {
    Alert.alert('Comment', 'Comment functionality would be implemented here');
  };

  const handleRegisterAsHost = () => {
    hostButtonScale.value = withSpring(0.95, {}, () => {
      hostButtonScale.value = withSpring(1);
    });
    router.push('/host-registration');
  };

  // Animated styles - must be called before any early returns
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 150, 300],
      [0, 0.7, 1],
      'clamp'
    );
    
    return {
      opacity,
    };
  });

  const profileImageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 200, 400],
      [1, 0.75, 0.5],
      'clamp'
    );
    
    const translateY = interpolate(
      scrollY.value,
      [0, 200, 400],
      [0, -30, -60],
      'clamp'
    );
    
    const glowOpacity = user?.isHost ? interpolate(profileGlow.value, [0, 1], [0.3, 0.7]) : 0;
    
    return {
      transform: [{ scale }, { translateY }],
      shadowOpacity: glowOpacity,
      shadowRadius: interpolate(profileGlow.value, [0, 1], [10, 20]),
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(buttonPulse.value, [0, 1], [1, 1.01]) }
      ],
      shadowOpacity: interpolate(buttonPulse.value, [0, 1], [0.2, 0.4]),
    };
  });

  const coverAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: coverFade.value,
    };
  });

  const miniHeaderStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [250, 300],
      [50, 0],
      'clamp'
    );
    
    const opacity = interpolate(
      scrollY.value,
      [250, 300],
      [0, 1],
      'clamp'
    );
    
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const notificationAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(notificationBounce.value, [0, 1], [1, 1.1]) }
      ],
    };
  });

  const hostButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hostButtonScale.value }],
  }));

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{error || 'User not found'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            // Re-fetch data
            const fetchUserData = async () => {
              try {
                if (!actualUserId || actualUserId === '') {
                  setError('No user ID available');
                  return;
                }
                const userProfile = await dataService.user.getUserProfile(actualUserId);
                if (userProfile) {
                  setUser(userProfile);
                  const posts = await dataService.post.getPostsByUser(actualUserId);
                  setUserPosts(posts);
                }
              } catch (err) {
                setError('Failed to load user data');
              } finally {
                setIsLoading(false);
              }
            };
            fetchUserData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <TouchableOpacity
      style={[styles.gridItem, { marginRight: (index + 1) % 3 === 0 ? 0 : 6 }]}
      onPress={() => handlePostPress(item)}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.gridImage} />
      ) : (
        <LinearGradient
          colors={['rgba(108, 92, 231, 0.15)', 'rgba(108, 92, 231, 0.05)']}
          style={styles.gridPlaceholder}
        >
          <Text style={styles.gridPlaceholderText} numberOfLines={3}>
            {item.content}
          </Text>
        </LinearGradient>
      )}
      
      <View style={styles.likeCountOverlay}>
        <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
        <Text style={styles.likeCountText}>{item.likes}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFlags = (rating: number) => {
    const flagColors = ['#FF4B4B', '#FF914D', '#FFC107', '#A3D977', '#4CAF50'];
    const filledFlags = Math.floor(rating);
    
    return (
      <View style={styles.flagContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.flagIcon,
              {
                backgroundColor: index < filledFlags ? flagColors[index] : '#3A3A3A',
              }
            ]}
          >
            <Flag size={12} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        ))}
      </View>
    );
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Charcoal Background */}
      <View style={styles.background} />

      {/* Refined Sticky Mini Header */}
      <Animated.View style={[styles.stickyHeader, headerAnimatedStyle, miniHeaderStyle]}>
        <BlurView intensity={40} style={styles.blurHeader}>
          <TouchableOpacity 
            onPress={() => handleBackNavigation()} 
            style={styles.backButton}
          >
            <ArrowLeft size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.miniHeaderTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            {user?.username || 'Profile'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleMessages} style={styles.headerIcon}>
              <MessageCircle size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Professional Cover Section */}
        <View style={styles.coverContainer}>
          <Animated.View style={coverAnimatedStyle}>
            <ImageBackground
              source={{ uri: coverImage }}
              style={styles.coverImage}
              blurRadius={1}
            >
              <LinearGradient
                colors={['transparent', 'rgba(30, 30, 30, 0.8)']}
                style={styles.coverGradient}
              />
            </ImageBackground>
          </Animated.View>
        </View>

        {/* Clean Profile Section */}
        <View style={styles.profileSection}>
          {/* Professional Profile Image */}
          <Animated.View style={[styles.profileImageContainer, profileImageAnimatedStyle]}>
            <View style={styles.profileImageWrapper}>
              {/* TODO: Replace with actual profile image from server */}
              <Image 
                source={{ 
                  uri: user?.avatar || user?.profilePicture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
                }} 
                style={styles.profileImage}
                defaultSource={{ uri: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' }}
              />
              {user?.isHost && (
                <View style={styles.crownBadge}>
                  <Crown size={18} color="#6C5CE7" fill="#6C5CE7" />
                </View>
              )}
              {user?.isHost && <View style={styles.premiumGlow} />}
            </View>
          </Animated.View>

          {/* Clean Typography */}
          <View style={styles.userInfo}>
            <Text style={[styles.username, fontsLoaded ? { fontFamily: 'Inter_700Bold' } : {}]}>
              {user?.username ?? 'Guest User'}
            </Text>
            
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#B0B0B0" />
              <Text style={[styles.locationText, fontsLoaded ? { fontFamily: 'Inter_400Regular' } : {}]}>
                {user?.location ?? 'Unknown Location'}
              </Text>
              <Text style={[styles.ageText, fontsLoaded ? { fontFamily: 'Inter_400Regular' } : {}]}>
                {user?.age ? ` • ${user.age}` : ''}
              </Text>
            </View>
            
            <Text style={[styles.bio, fontsLoaded ? { fontFamily: 'Inter_400Regular' } : {}]}>
              {user?.bio ?? 'No bio available'}
            </Text>
          </View>

          {/* Profile Completion Prompt - Only show for current user */}
          {isCurrentUser && (!user?.bio || !user?.location) && (
            <View style={styles.completionPrompt}>
              <View style={styles.completionPromptContent}>
                <Text style={[styles.completionPromptTitle, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
                  Complete Your Profile
                </Text>
                <Text style={[styles.completionPromptText, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
                  Add your bio and location to get better matches
                </Text>
                <TouchableOpacity 
                  style={styles.completionButton}
                  onPress={() => router.push('/profile-completion')}
                >
                  <Text style={styles.completionButtonText}>Complete Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Professional Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.statPosts, { fontFamily: 'Inter_700Bold' }]}>
                {userPosts.length}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Posts</Text>
            </View>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/followers-following?userId=${user?.id}&tab=followers`)}
            >
              <Text style={[styles.statNumber, styles.statFollowers, { fontFamily: 'Inter_700Bold' }]}>
                {user?.followersCount || '0'}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/followers-following?userId=${user?.id}&tab=following`)}
            >
              <Text style={[styles.statNumber, styles.statFollowing, { fontFamily: 'Inter_700Bold' }]}>
                {user?.followingCount || '0'}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Community Trust Score */}
          {user?.isHost && (
            <View style={styles.trustSection}>
              {renderFlags(4.2)}
              <Text style={[styles.trustLabel, { fontFamily: 'Inter_500Medium' }]}>
                Community Trust Score
              </Text>
            </View>
          )}

          {/* Debug Button - Temporary */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                if (user?.id) {
                  const testCounts = await dataService.user.testFollowerCounts(user.id);
                  console.log('Debug - Follower counts:', testCounts);
                  Alert.alert('Debug Info', `Followers: ${testCounts.followersCount}, Following: ${testCounts.followingCount}`);
                }
              }}
            >
              <Text style={styles.debugButtonText}>Debug: Test Follower Counts</Text>
            </TouchableOpacity>
          )}

          {/* Clean Action Buttons */}
          <View style={styles.actionButtons}>
            {isCurrentUser ? (
              <>
                {/* Register as Host Button (if not already a host) */}
                {!user?.isHost && (
                  <Animated.View
                    style={[styles.hostButton, hostButtonAnimatedStyle]}
                  >
                    <TouchableOpacity onPress={handleRegisterAsHost}>
                      <LinearGradient
                        colors={['#6C5CE7', '#5A4FCF']}
                        style={styles.hostButtonGradient}
                      >
                        <Crown size={18} color="#FFFFFF" />
                        <Text style={[styles.hostButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                          Register as Host
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </>
            ) : (
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={[styles.followButton, isFollowing && styles.followingButton]} 
                  onPress={handleFollow}
                >
                  <LinearGradient
                    colors={isFollowing ? ['#666666', '#555555'] : ['#6C5CE7', '#5A4FCF']}
                    style={styles.followButtonGradient}
                  >
                    {isFollowing ? (
                      <UserCheck size={18} color="#FFFFFF" />
                    ) : (
                      <UserPlus size={18} color="#FFFFFF" />
                    )}
                    <Text style={[styles.followButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.messageButton} onPress={handleMessages}>
                  <BlurView intensity={30} style={styles.messageButtonBlur}>
                    <MessageCircle size={18} color="#FFFFFF" />
                    <Text style={[styles.messageButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                      Message
                    </Text>
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Professional Bulletin Board */}
        <BulletinBoardSection isCurrentUser={isCurrentUser} />

        {/* Reviews Section */}
        <ReviewsSection 
          user={user} 
          onRefresh={() => {
            // Refresh user data to get updated trust score
            const refreshUserData = async () => {
              try {
                const userProfile = await dataService.user.getUserProfile(actualUserId);
                if (userProfile) {
                  setUser(userProfile);
                }
              } catch (err) {
                console.error('Error refreshing user data:', err);
              }
            };
            refreshUserData();
          }}
        />

        {/* Clean Posts Grid */}
        <View style={styles.postsSection}>
          <View style={styles.postsHeader}>
            <Grid size={22} color="#FFFFFF" />
            <Text style={[styles.postsHeaderText, { fontFamily: 'Inter_600SemiBold' }]}>
              Posts
            </Text>
          </View>

          {userPosts.length > 0 ? (
            <FlatList
              data={userPosts}
              renderItem={renderPost}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.postsGrid}
              columnWrapperStyle={styles.row}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { fontFamily: 'Inter_600SemiBold' }]}>
                No posts yet
              </Text>
              <Text style={[styles.emptySubtext, { fontFamily: 'Inter_400Regular' }]}>
                {isCurrentUser ? 'Share your creative work' : `${user?.username || 'User'} hasn't posted yet`}
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Full Screen Post Viewer */}
      <FullScreenPostViewer
        visible={showFullScreenPost}
        posts={userPosts}
        initialIndex={selectedPostIndex}
        onClose={() => setShowFullScreenPost(false)}
        onLike={handleLike}
        onComment={handleComment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1E1E', // Charcoal background
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
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 100,
  },
  blurHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    padding: 16,
    minWidth: 52,
    minHeight: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#6C5CE7', // Royal Purple
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  notificationText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  coverContainer: {
    height: 220,
    marginBottom: -70,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  coverEditButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  coverEditBlur: {
    padding: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    zIndex: 20,
  },
  profileImageContainer: {
    marginBottom: 24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3A3A3A',
  },
  premiumGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: PROFILE_IMAGE_SIZE + 4,
    height: PROFILE_IMAGE_SIZE + 4,
    borderRadius: 62,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    opacity: 0.6,
  },
  crownBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#2A2A2A',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  username: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: '#B0B0B0',
    marginLeft: 6,
  },
  ageText: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  bio: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statPosts: {
    color: '#6C5CE7', // Royal Purple
  },
  statFollowers: {
    color: '#FFD700', // Gold
  },
  statFollowing: {
    color: '#C0C0C0', // Silver
  },
  statLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 4,
    fontWeight: '400',
  },
  trustSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  flagContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  flagIcon: {
    width: 32,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  trustLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  actionButtons: {
    width: '100%',
  },
  editButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  hostButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  hostButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  hostButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  followButton: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  followingButton: {
    opacity: 0.8,
  },
  followButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  messageButton: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  messageButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  postsSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  postsHeaderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  postsGrid: {
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridItem: {
    width: imageSize,
    height: imageSize,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2A2A2A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  gridPlaceholderText: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  likeCountOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  likeCountText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Profile Completion Prompt Styles
  completionPrompt: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  completionPromptContent: {
    alignItems: 'center',
  },
  completionPromptTitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 8,
  },
  completionPromptText: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 16,
  },
  completionButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  completionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});