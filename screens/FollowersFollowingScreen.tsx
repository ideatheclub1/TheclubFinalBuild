import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserPlus, UserMinus, Users, UserCheck } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import { User } from '@/types';
import { handleProfileBackNavigation } from '@/utils/navigation';
import { useDebugLogger, debug } from '@/utils/debugLogger';

type TabType = 'followers' | 'following';

interface FollowersFollowingScreenProps {
  route?: {
    params?: {
      userId?: string;
      initialTab?: TabType;
    };
  };
}

export default function FollowersFollowingScreen({ route }: FollowersFollowingScreenProps) {
  const debugLogger = useDebugLogger('FollowersFollowingScreen');
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; tab: TabType }>();
  const { user: currentUser } = useUser();
  
  const userId = route?.params?.userId || params?.userId || currentUser?.id || '';
  const initialTab = (route?.params?.initialTab || params?.tab || 'followers') as TabType;
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Followers/Following screen loaded', { 
      userId, 
      initialTab, 
      currentUserId: currentUser?.id 
    });
  }, [userId, initialTab, currentUser?.id]);

  const loadData = async () => {
    if (!userId) {
      console.log('🔍 FollowersFollowingScreen: No userId provided');
      return;
    }
    
    console.log('🔍 FollowersFollowingScreen: Starting to load data for userId:', userId);
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [followersData, followingData] = await Promise.all([
        dataService.user.getFollowers(userId, currentUser?.id),
        dataService.user.getFollowing(userId, currentUser?.id),
      ]);
      
      console.log('🔍 FollowersFollowingScreen: Data loaded', {
        followersCount: followersData.length,
        followingCount: followingData.length
      });
      
      setFollowers(followersData);
      setFollowing(followingData);
      
    } catch (err) {
      console.error('❌ FollowersFollowingScreen: Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }

    try {
      let success = false;
      if (isCurrentlyFollowing) {
        success = await dataService.user.unfollowUser(currentUser.id, targetUserId);
      } else {
        success = await dataService.user.followUser(currentUser.id, targetUserId);
      }

      if (success) {
        // Update the lists
        if (activeTab === 'following') {
          setFollowing(prev => 
            isCurrentlyFollowing 
              ? prev.filter(user => user.id !== targetUserId)
              : prev.map(user => 
                  user.id === targetUserId 
                    ? { ...user, isFollowing: true }
                    : user
                )
          );
        } else {
          setFollowers(prev => 
            prev.map(user => 
              user.id === targetUserId 
                ? { ...user, isFollowing: !isCurrentlyFollowing }
                : user
            )
          );
        }
      } else {
        Alert.alert('Error', `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleUserPress = (user: User) => {
    router.push(`/profile?userId=${user.id}`);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 FollowersFollowingScreen: Screen focused, refreshing data');
      loadData();
    }, [userId])
  );

  const renderUserItem = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === currentUser?.id;
    const isFollowing = item.isFollowing || false;

    return (
      <View style={styles.userItem}>
        <TouchableOpacity 
          style={styles.userItemContent}
          onPress={() => handleUserPress(item)}
          activeOpacity={0.7}
        >
          <Image 
            source={{ 
              uri: item.avatar || item.profilePicture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
            }} 
            style={styles.userAvatar}
          />
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.fullName || item.username || 'Unknown User'}
            </Text>
            <Text style={styles.userHandle}>
              @{item.handle || item.username || 'unknown'}
            </Text>
            {item.bio && (
              <Text style={styles.userBio} numberOfLines={2}>
                {item.bio}
              </Text>
            )}
          </View>

          {!isCurrentUser && (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton
              ]}
              onPress={() => handleFollowToggle(item.id, isFollowing)}
              activeOpacity={0.7}
            >
              {isFollowing ? (
                <UserMinus size={16} color="#FFFFFF" />
              ) : (
                <UserPlus size={16} color="#FFFFFF" />
              )}
              <Text style={styles.followButtonText}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        {activeTab === 'followers' ? (
          <Users size={64} color="#6C5CE7" />
        ) : (
          <UserCheck size={64} color="#6C5CE7" />
        )}
      </View>
      
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'followers' ? 'No Followers Yet' : 'Not Following Anyone'}
      </Text>
      
      <Text style={styles.emptyStateText}>
        {activeTab === 'followers' 
          ? 'Start connecting with people to build your network!'
          : 'Discover amazing people to follow and stay connected!'
        }
      </Text>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.primaryActionButton}
          onPress={() => router.push('/search')}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryActionButtonText}>
            {activeTab === 'followers' ? 'Find People to Follow' : 'Discover Users'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryButtonsRow}>
          <TouchableOpacity 
            style={styles.secondaryActionButton}
            onPress={() => router.push('/trending')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryActionButtonText}>
              Browse Trending
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tertiaryActionButton}
            onPress={() => {
              Alert.alert('Coming Soon', 'Invite friends feature will be available soon!');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.tertiaryActionButtonText}>
              Invite Friends
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 Tips to get started:</Text>
        <Text style={styles.tipText}>
          {activeTab === 'followers' 
            ? '• Complete your profile to attract followers\n• Share interesting posts and stories\n• Engage with other users\' content'
            : '• Search for people with similar interests\n• Follow hosts and mentors\n• Connect with friends and family'
          }
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6C5CE7', '#A29BFE']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => handleProfileBackNavigation(userId)}
        >
          <ArrowLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {activeTab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following ({following.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'followers' ? followers : following}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#6C5CE7']}
              tintColor="#6C5CE7"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    padding: 16,
    minWidth: 52,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginLeft: -40,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  userItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 2,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    color: '#AAA',
    lineHeight: 18,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  followingButton: {
    backgroundColor: '#333',
  },
  followButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    flex: 1,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  actionButtonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  primaryActionButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
  },
  primaryActionButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  secondaryActionButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    shadowColor: '#333',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  tertiaryActionButton: {
    backgroundColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    shadowColor: '#444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tertiaryActionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
}); 