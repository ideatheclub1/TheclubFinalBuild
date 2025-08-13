import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Switch,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Filter, MessageCircle, MapPin, Star, Heart, Search, X, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import LocationSearch from '@/components/LocationSearch';
import DistanceSlider from '@/components/DistanceSlider';
import AgeSlider from '@/components/AgeSlider';
import FilterModal from '@/components/FilterModal';
import { calculateDistance, formatDistance } from '@/utils/distanceCalculator';
import { dataService } from '@/services/dataService';
import { useUser } from '@/contexts/UserContext';
import { debug, useDebugLogger } from '@/utils/debugLogger';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width > 400 ? (width - 64) / 2 : width - 32;

import { User } from '@/types';




const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function SearchScreen() {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('SearchScreen');
  
  // Log page load
  debug.pageLoad('SearchScreen', { currentUserId: currentUser?.id });
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocalHosts, setShowLocalHosts] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [searchLatitude, setSearchLatitude] = useState<number | undefined>();
  const [searchLongitude, setSearchLongitude] = useState<number | undefined>();
  const [maxDistance, setMaxDistance] = useState(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 65,
    maxDistance: 0,
    minRating: 0,
    maxPrice: 200,
    showHostsOnly: false,
    showOnlineOnly: false,
    selectedRoles: [] as string[],
    selectedInterests: [] as string[],
  });
  
  // Load Inter fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Helper function to check if search query looks like a username
  const isUsernameSearch = (query: string): boolean => {
    // Username search patterns:
    // 1. Starts with @ symbol
    // 2. Contains no spaces (likely a username)
    // 3. Contains only alphanumeric characters, underscores, and dots
    // 4. Length between 3-30 characters (typical username length)
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.startsWith('@')) {
      return true;
    }
    
    if (trimmedQuery.length >= 3 && trimmedQuery.length <= 30 && !trimmedQuery.includes(' ')) {
      // Check if it contains only valid username characters
      const usernameRegex = /^[a-zA-Z0-9._]+$/;
      return usernameRegex.test(trimmedQuery);
    }
    
    return false;
  };

  // Search users from database
  const searchUsers = useCallback(async () => {
    if (!currentUser) {
      debugLogger.info('SEARCH_SKIP', 'No current user, skipping search');
      return;
    }
    
    try {
      debugLogger.process('SEARCH_START', 'Starting user search');
      setIsLoading(true);
      setError(null);
      
      // Check if this is a username search
      const isUsername = isUsernameSearch(searchQuery);
      
      if (isUsername) {
        debugLogger.info('SEARCH_TYPE', 'Username search detected, bypassing filters');
      } else {
        debugLogger.info('SEARCH_TYPE', 'General search, applying filters');
      }
      
      const searchParams = {
        query: searchQuery,
        location: isUsername ? undefined : searchLocation, // Skip location for username search
        latitude: isUsername ? undefined : searchLatitude, // Skip coordinates for username search
        longitude: isUsername ? undefined : searchLongitude, // Skip coordinates for username search
        maxDistance: isUsername ? undefined : filters.maxDistance, // Skip distance filter for username search
        minAge: isUsername ? undefined : filters.minAge, // Skip age filter for username search
        maxAge: isUsername ? undefined : filters.maxAge, // Skip age filter for username search
        minRating: isUsername ? undefined : filters.minRating, // Skip rating filter for username search
        maxPrice: isUsername ? undefined : filters.maxPrice, // Skip price filter for username search
        showHostsOnly: isUsername ? false : filters.showHostsOnly, // Skip host filter for username search
        showOnlineOnly: isUsername ? false : filters.showOnlineOnly, // Skip online filter for username search
        roles: isUsername ? [] : filters.selectedRoles, // Skip role filter for username search
        interests: isUsername ? [] : filters.selectedInterests, // Skip interest filter for username search
        currentUserId: currentUser.id,
      };
      
      debugLogger.info('SEARCH_PARAMS', 'Search parameters prepared', { 
        ...searchParams, 
        isUsernameSearch: isUsername,
        originalFilters: filters 
      });
      
      const searchResults = await dataService.user.searchUsers(searchParams);
      debugLogger.success('SEARCH_RESULTS', `Found ${searchResults.length} users`, { 
        count: searchResults.length, 
        isUsernameSearch: isUsername 
      });
      setUsers(searchResults);
    } catch (err) {
      debugLogger.error('SEARCH_ERROR', 'Error searching users', err);
      setError('Failed to search users. Please try again.');
    } finally {
      debugLogger.info('SEARCH_COMPLETE', 'Search operation completed');
      setIsLoading(false);
    }
  }, [searchQuery, searchLocation, searchLatitude, searchLongitude, filters, currentUser]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  // Initial search on component mount
  useEffect(() => {
    debugLogger.info('COMPONENT_MOUNT', `Component mounted, currentUser: ${currentUser?.id}`);
    searchUsers();
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    debugLogger.info('FILTER_CHANGE', 'Filters updated', { oldFilters: filters, newFilters });
    setFilters(newFilters);
  };

  const handleMessagesPress = () => {
    debugLogger.info('NAVIGATION', 'Navigating to messages');
    router.push('/(tabs)/messages');
  };

  // Smart message handler - checks for existing conversation first
  const handleMessageUser = async (user: User) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to send messages');
      return;
    }

    if (user.id === currentUser.id) {
      Alert.alert('Info', 'You cannot message yourself');
      return;
    }

    try {
      debugLogger.info('MESSAGE_USER', 'Checking for existing conversation', { 
        currentUserId: currentUser.id,
        targetUserId: user.id,
        targetUserName: user.fullName || user.username 
      });

      // First, check if conversation already exists
      const existingConversationId = await dataService.message.findConversationWithUser(
        currentUser.id, 
        user.id
      );

      if (existingConversationId) {
        // Redirect to existing conversation
        debugLogger.success('MESSAGE_USER', 'Redirecting to existing conversation', { 
          conversationId: existingConversationId 
        });
        
        router.push({
          pathname: '/conversation',
          params: { 
            mode: 'chat',
            conversationId: existingConversationId,
            userId: user.id,
            userName: user.fullName || user.username
          }
        });
      } else {
        // Create new conversation
        debugLogger.info('MESSAGE_USER', 'Creating new conversation', { 
          targetUserId: user.id,
          targetUserName: user.fullName || user.username 
        });
        
        router.push({
          pathname: '/conversation',
          params: { 
            mode: 'chat',
            createWithUserId: user.id,
            userName: user.fullName || user.username
          }
        });
      }
    } catch (error) {
      debugLogger.error('MESSAGE_USER', 'Failed to handle message user', error);
      Alert.alert('Error', 'Failed to open conversation. Please try again.');
    }
  };

  const handleNotificationPress = () => {
    debugLogger.info('USER_ACTION', 'Notification button pressed');
    // Handle notification press
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={12}
        color={index < Math.floor(rating) ? '#FFD700' : '#4A4A4A'}
        fill={index < Math.floor(rating) ? '#FFD700' : 'transparent'}
      />
    ));
  };

  const UserCard = ({ user, index }: { user: User; index: number }) => {
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.2);

    const handlePressIn = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(0.96);
      shadowOpacity.value = withTiming(0.4);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      shadowOpacity.value = withTiming(0.2);
    };

    const handlePress = () => {
      debugLogger.info('USER_ACTION', `User card pressed for user: ${user.id}`, { userId: user.id, userName: user.fullName });
      router.push({
        pathname: '/ProfileScreen',
        params: { userId: user.id }
      });
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    }));

    return (
      <Animated.View
        style={[styles.userCard, animatedStyle]}
      >
        <BlurView intensity={20} style={styles.cardBlur}>
          <LinearGradient
            colors={['rgba(42, 42, 42, 0.95)', 'rgba(58, 58, 58, 0.85)']}
            style={styles.cardGradient}
          >
            {/* Profile Image */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: user.avatar || user.profilePicture }} style={styles.profileImage} />
              <View style={styles.onlineIndicator} />
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
                {user.fullName || user.username}
              </Text>
              
              <View style={styles.locationRow}>
                <MapPin size={14} color="#B0B0B0" />
                <Text style={[styles.locationText, { fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                  {user.location}
                  {user.distanceKm !== undefined && (
                    <Text style={styles.distanceText}> • {formatDistance(user.distanceKm)}</Text>
                  )}
                </Text>
              </View>

              {/* Tags */}
              <View style={styles.tagsContainer}>
                {user.interests && user.interests.slice(0, 2).map((tag: string, tagIndex: number) => (
                  <View key={tagIndex} style={styles.tag}>
                    <Text style={[styles.tagText, { fontFamily: 'Inter_500Medium' }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Rating */}
              <View style={styles.ratingContainer}>
                <View style={styles.starsRow}>
                  {renderStars(user.rating || 0)}
                </View>
                <Text style={[styles.ratingText, { fontFamily: 'Inter_500Medium' }]}>
                  {user.rating}
                </Text>
              </View>

              {/* Price */}
              <Text style={[styles.priceText, { fontFamily: 'Inter_600SemiBold' }]}>
                ${user.hourlyRate}/hr
              </Text>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={async (e) => {
                    e.stopPropagation();
                    await handleMessageUser(user);
                  }}
                >
                  <MessageCircle size={14} color="#FFFFFF" />
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.profileButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/ProfileScreen',
                      params: { userId: user.id }
                    });
                  }}
                >
                  <Text style={styles.profileButtonText}>Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1E1E1E', '#2A2A2A', '#1E1E1E']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Heart size={24} color="#E74C3C" fill="#E74C3C" />
            <Text style={[styles.logoText, { fontFamily: 'Inter_700Bold' }]}>
              The Club
            </Text>
          </View>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              onPress={handleNotificationPress} 
              style={styles.iconButton}
            >
              <Bell size={22} color="#B0B0B0" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleMessagesPress} 
              style={styles.iconButton}
            >
              <MessageCircle size={22} color="#B0B0B0" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Search size={20} color="#B0B0B0" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { fontFamily: 'Inter_400Regular' }]}
                placeholder="Search by username (@username), name, or interests..."
                placeholderTextColor="#B0B0B0"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={20} color="#B0B0B0" />
                </TouchableOpacity>
              )}
            </View>

            {/* Location Search */}
            <LocationSearch
              value={searchLocation}
              onLocationSelect={(location, latitude, longitude) => {
                setSearchLocation(location);
                setSearchLatitude(latitude);
                setSearchLongitude(longitude);
              }}
              placeholder="Search by location..."
              label="Location"
            />



            {/* Filter Row */}
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[
                  styles.filterButton,
                  isUsernameSearch(searchQuery) && styles.filterButtonDisabled
                ]}
                onPress={() => !isUsernameSearch(searchQuery) && setShowFilterModal(true)}
                disabled={isUsernameSearch(searchQuery)}
              >
                <Filter size={18} color={isUsernameSearch(searchQuery) ? "#666" : "#7A4FE2"} />
                <Text style={[
                  styles.filterText, 
                  { fontFamily: 'Inter_500Medium' },
                  isUsernameSearch(searchQuery) && styles.filterTextDisabled
                ]}>
                  Filters
                </Text>
              </TouchableOpacity>
              
              {/* Username Search Indicator */}
              {isUsernameSearch(searchQuery) && searchQuery.trim().length > 0 && (
                <View style={styles.usernameIndicator}>
                  <Text style={[styles.usernameIndicatorText, { fontFamily: 'Inter_500Medium' }]}>
                    🔍 Username search - filters disabled
                  </Text>
                </View>
              )}
              
              <View style={[
                styles.localHostToggle,
                isUsernameSearch(searchQuery) && styles.localHostToggleDisabled
              ]}>
                <Text style={[
                  styles.toggleText, 
                  { fontFamily: 'Inter_500Medium' },
                  isUsernameSearch(searchQuery) && styles.toggleTextDisabled
                ]}>
                  Local Hosts
                </Text>
                <Switch
                  value={showLocalHosts}
                  onValueChange={isUsernameSearch(searchQuery) ? undefined : setShowLocalHosts}
                  trackColor={{ false: '#3A3A3A', true: '#7A4FE2' }}
                  thumbColor={showLocalHosts ? '#F5F5F5' : '#B0B0B0'}
                  ios_backgroundColor="#3A3A3A"
                  disabled={isUsernameSearch(searchQuery)}
                />
              </View>
            </View>
          </View>

          {/* Users Grid */}
          <View style={styles.usersSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Discover People ({users.length})
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => {
                  debugLogger.info('USER_ACTION', 'Manual refresh triggered');
                  searchUsers();
                }}
              >
                <Text style={[styles.refreshButtonText, { fontFamily: 'Inter_500Medium' }]}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
            
            {isLoading && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#6C5CE7" />
                <Text style={[styles.loadingText, { fontFamily: 'Inter_400Regular' }]}>
                  Searching for people...
                </Text>
              </View>
            )}
            
            {error && (
              <View style={styles.errorState}>
                <Text style={[styles.errorText, { fontFamily: 'Inter_400Regular' }]}>
                  {error}
                </Text>
              </View>
            )}
            
            {!isLoading && !error && users.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { fontFamily: 'Inter_400Regular' }]}>
                  No users found. Try adjusting your search criteria.
                </Text>
              </View>
            )}
            
            {!isLoading && !error && users.length > 0 && (
              <View style={styles.usersGrid}>
                {users.map((user, index) => (
                  <UserCard key={user.id} user={user} index={index} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setMaxDistance(newFilters.maxDistance);
          }}
          currentFilters={filters}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#F5F5F5',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#F5F5F5',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#7A4FE2',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#F5F5F5',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  filterText: {
    color: '#7A4FE2',
    fontSize: 14,
    marginLeft: 8,
  },
  localHostToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  usersSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#F5F5F5',
    marginBottom: 20,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: width > 400 ? 'space-between' : 'center',
  },
  userCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBlur: {
    flex: 1,
  },
  cardGradient: {
    padding: 20,
    minHeight: 240,
  },
  imageContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#7A4FE2',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00D46A',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  userInfo: {
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 18,
    color: '#F5F5F5',
    marginBottom: 8,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(122, 79, 226, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(122, 79, 226, 0.4)',
  },
  tagText: {
    fontSize: 12,
    color: '#7A4FE2',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  priceText: {
    fontSize: 18,
    color: '#F5F5F5',
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  usernameIndicator: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    marginLeft: 8,
  },
  usernameIndicatorText: {
    fontSize: 12,
    color: '#6C5CE7',
  },
  filterButtonDisabled: {
    opacity: 0.5,
  },
  filterTextDisabled: {
    color: '#666',
  },
  localHostToggleDisabled: {
    opacity: 0.5,
  },
  toggleTextDisabled: {
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#6C5CE7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  profileButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  profileButtonText: {
    color: '#6C5CE7',
    fontSize: 12,
    fontWeight: '600',
  },
});