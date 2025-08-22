import { supabase } from '@/app/lib/supabase';
import { 
  User, Post, Story, Reel, Message, Conversation, Comment, 
  Review, HostProfile, BulletinNote 
} from '@/types';
import { calculateDistance } from '@/utils/distanceCalculator';
import { debug, debugLogger } from '@/utils/debugLogger';
import { cacheService } from './cacheService';
import * as FileSystem from 'expo-file-system';

// =====================================================
// FILE HELPERS
// =====================================================

const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleaned = base64.replace(/^data:.*;base64,/, '');
  
  // Use native atob if available (web), otherwise use manual conversion
  let binaryString: string;
  if (typeof atob !== 'undefined') {
    binaryString = atob(cleaned);
  } else {
    // Manual base64 decode for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < cleaned.length) {
      const encoded1 = chars.indexOf(cleaned[i++]);
      const encoded2 = chars.indexOf(cleaned[i++]);
      const encoded3 = chars.indexOf(cleaned[i++]);
      const encoded4 = chars.indexOf(cleaned[i++]);
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    binaryString = result;
  }
  
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const readUriToUint8Array = async (uri: string): Promise<Uint8Array> => {
  debugLogger.info('STORAGE', 'READ_URI_START', `Reading file from URI: ${uri}`);
  
  // Method 1: Try FileSystem first for React Native file URIs
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
    try {
      debugLogger.info('STORAGE', 'READ_URI_FILESYSTEM', 'Using FileSystem for native URI');
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      if (!base64 || base64.length === 0) {
        throw new Error('Empty base64 string from FileSystem');
      }
      
      const u8 = base64ToUint8Array(base64);
      debugLogger.info('STORAGE', 'READ_URI_SUCCESS', `FileSystem read successful: ${u8.byteLength} bytes`);
      
      if (u8.byteLength > 0) return u8;
      throw new Error('Converted Uint8Array is empty');
    } catch (fsError) {
      debugLogger.error('STORAGE', 'READ_URI_FILESYSTEM_ERROR', 'FileSystem read failed', fsError);
      // Continue to next method
    }
  }
  
  // Method 2: Try fetch for web URIs and some native URIs
  try {
    debugLogger.info('STORAGE', 'READ_URI_FETCH', 'Using fetch for URI');
    const resp = await fetch(uri);
    
    if (!resp.ok) {
      throw new Error(`Fetch failed with status: ${resp.status}`);
    }
    
    const ab = await resp.arrayBuffer();
    const u8 = new Uint8Array(ab);
    debugLogger.info('STORAGE', 'READ_URI_SUCCESS', `Fetch read successful: ${u8.byteLength} bytes`);
    
    if (u8.byteLength > 0) return u8;
    throw new Error('Fetched ArrayBuffer is empty');
  } catch (fetchError) {
    debugLogger.error('STORAGE', 'READ_URI_FETCH_ERROR', 'Fetch read failed', fetchError);
  }
  
  // Method 3: Last resort - try to read as data URI
  if (uri.startsWith('data:')) {
    try {
      debugLogger.info('STORAGE', 'READ_URI_DATA', 'Processing data URI');
      const u8 = base64ToUint8Array(uri);
      debugLogger.info('STORAGE', 'READ_URI_SUCCESS', `Data URI read successful: ${u8.byteLength} bytes`);
      
      if (u8.byteLength > 0) return u8;
    } catch (dataError) {
      debugLogger.error('STORAGE', 'READ_URI_DATA_ERROR', 'Data URI read failed', dataError);
    }
  }

  const error = new Error(`Unable to read file contents from URI: ${uri}`);
  debugLogger.error('STORAGE', 'READ_URI_FAILED', 'All read methods failed', error);
  throw error;
};

// =====================================================
// USER OPERATIONS
// =====================================================

export const userService = {
  // Get user profile by ID
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const startTime = Date.now();
      debug.dbQuery('user_profiles', 'SELECT', { userId });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debug.dbError('user_profiles', 'SELECT', error);
        return null;
      }
      
      if (!data) {
        debugLogger.warn('DATABASE', 'SELECT_USER_PROFILE', `No user profile found for ID: ${userId}`);
        return null;
      }

      debug.dbSuccess('user_profiles', 'SELECT', { userId, userData: data }, Date.now() - startTime);
      
      return {
          id: data.id,
          username: data.username || data.handle || '',
          avatar: data.avatar || data.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: data.bio || '',
          location: data.location || '',
          age: data.age || 0,
          isHost: data.is_host || false,
          hourlyRate: data.hourly_rate || 0,
          totalChats: data.total_chats || 0,
          responseTime: data.response_time || '5 min',
          isFollowing: false, // Will be checked separately
          fullName: data.full_name,
          handle: data.handle,
          profilePicture: data.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          gender: data.gender,
          dateOfBirth: data.date_of_birth,
          isVerified: data.is_verified,
          isOnline: data.is_online,
          lastSeen: data.last_seen,
          rating: data.rating,
          totalReviews: data.total_reviews,
          faceData: data.face_data,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          // Profile completion fields
          interests: data.interests || [],
          expertise: data.expertise || [],
          relationshipGoals: data.relationship_goals || [],
          lookingFor: data.looking_for || 'Everyone',
          agePreferenceMin: data.age_preference_min || 18,
          agePreferenceMax: data.age_preference_max || 50,
          distancePreference: data.distance_preference || 50,
          profileCompletionPercentage: data.profile_completion_percentage || 0,
          lastProfileUpdate: data.last_profile_update,
          // Location coordinates
          latitude: data.latitude,
          longitude: data.longitude,
          locationUpdatedAt: data.location_updated_at,
          // Follower/Following counts (for future use)
          followersCount: data.followers_count || 0,
          followingCount: data.following_count || 0,
          // Community trust score
          communityTrustScore: data.community_trust_score || 0,
        };
    } catch (error) {
      debugLogger.error('DATABASE', 'SELECT_USER_PROFILE', 'Exception occurred while fetching user profile', error);
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.fullName,
          handle: updates.handle,
          username: updates.username,
          avatar: updates.avatar,
          profile_picture: updates.profilePicture,
          bio: updates.bio,
          location: updates.location,
          age: updates.age,
          gender: updates.gender,
          date_of_birth: updates.dateOfBirth,
          is_host: updates.isHost,
          hourly_rate: updates.hourlyRate,
          total_chats: updates.totalChats,
          response_time: updates.responseTime,
          rating: updates.rating,
          total_reviews: updates.totalReviews,
          face_data: updates.faceData,
          // Profile completion fields
          interests: updates.interests,
          expertise: updates.expertise,
          relationship_goals: updates.relationshipGoals,
          looking_for: updates.lookingFor,
          age_preference_min: updates.agePreferenceMin,
          age_preference_max: updates.agePreferenceMax,
          distance_preference: updates.distancePreference,
          // Location coordinates
          latitude: updates.latitude,
          longitude: updates.longitude,
          // Follower/Following counts (for future use)
          followers_count: updates.followersCount,
          following_count: updates.followingCount,
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  },

  // Update user location with coordinates
  async updateUserLocation(userId: string, location: string, latitude: number, longitude: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('update_user_location', {
          user_id: userId,
          new_location: location,
          new_latitude: latitude,
          new_longitude: longitude
        });

      return !error;
    } catch (error) {
      console.error('Error updating user location:', error);
      return false;
    }
  },

  // Find nearby users
  async findNearbyUsers(latitude: number, longitude: number, maxDistanceKm: number = 50, limit: number = 20): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .rpc('find_nearby_users', {
          user_lat: latitude,
          user_lon: longitude,
          max_distance_km: maxDistanceKm,
          limit_count: limit
        });

      if (error || !data) return [];

      return (data as any[]).map((user: any) => ({
        id: user.id,
        username: user.username || user.handle || '',
        avatar: user.avatar || user.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        bio: user.bio || '',
        location: user.location || '',
        age: user.age || 0,
        isHost: user.is_host || false,
        hourlyRate: user.hourly_rate || 0,
        totalChats: user.total_chats || 0,
        responseTime: user.response_time || '5 min',
        isFollowing: false,
        fullName: user.full_name,
        handle: user.handle,
        profilePicture: user.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        distanceKm: user.distance_km,
        rating: user.rating,
        totalReviews: user.total_reviews,
        profileCompletionPercentage: user.profile_completion_percentage,
      }));
    } catch (error) {
      console.error('Error finding nearby users:', error);
      return [];
    }
  },

  // Check if user is following another user
  async checkFollowStatus(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  },

  // Test function to verify follower counts are working
  async testFollowerCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('followers_count, following_count')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching follower counts:', error);
        return { followersCount: 0, followingCount: 0 };
      }

      return {
        followersCount: data?.followers_count || 0,
        followingCount: data?.following_count || 0
      };
    } catch (error) {
      console.error('Error testing follower counts:', error);
      return { followersCount: 0, followingCount: 0 };
    }
  },

  // Follow a user
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('followers')
        .insert({
          follower_id: followerId,
          following_id: followingId,
        });

      if (!error) {
        debug.dbSuccess('followers', 'INSERT', { followerId, followingId });
      }

      return !error;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  },

  // Unfollow a user
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (!error) {
        debug.dbSuccess('followers', 'DELETE', { followerId, followingId });
      }

      return !error;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  },

  // Update follower/following counts
  async updateFollowerCounts(followerId: string, followingId: string, change: number): Promise<void> {
    try {
      // Get current counts first
      const { data: followerData } = await supabase
        .from('user_profiles')
        .select('following_count')
        .eq('id', followerId)
        .single();

      const { data: followingData } = await supabase
        .from('user_profiles')
        .select('followers_count')
        .eq('id', followingId)
        .single();

      // Update following count for the follower
      await supabase
        .from('user_profiles')
        .update({ 
          following_count: (followerData?.following_count || 0) + change
        })
        .eq('id', followerId);

      // Update follower count for the person being followed
      await supabase
        .from('user_profiles')
        .update({ 
          followers_count: (followingData?.followers_count || 0) + change
        })
        .eq('id', followingId);
    } catch (error) {
      console.error('Error updating follower counts:', error);
    }
  },

  // Manual follower count update (fallback if triggers aren't working)
  async updateFollowerCountsManually(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    try {
      console.log('🔍 updateFollowerCountsManually: Updating counts for userId:', userId);
      
      // Count followers (people following this user)
      const { data: followersData, error: followersError } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('following_id', userId);

      if (followersError) {
        console.error('❌ updateFollowerCountsManually: Error counting followers:', followersError);
        return { followersCount: 0, followingCount: 0 };
      }

      // Count following (people this user is following)
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) {
        console.error('❌ updateFollowerCountsManually: Error counting following:', followingError);
        return { followersCount: 0, followingCount: 0 };
      }

      const followersCount = followersData?.length || 0;
      const followingCount = followingData?.length || 0;

      console.log('🔍 updateFollowerCountsManually: Calculated counts', { followersCount, followingCount });

      // Update the user profile with the correct counts
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          followers_count: followersCount,
          following_count: followingCount
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ updateFollowerCountsManually: Error updating user profile:', updateError);
        return { followersCount: 0, followingCount: 0 };
      }

      console.log('🔍 updateFollowerCountsManually: Successfully updated counts', { followersCount, followingCount });
      return { followersCount, followingCount };
    } catch (error) {
      console.error('❌ updateFollowerCountsManually: Exception occurred:', error);
      return { followersCount: 0, followingCount: 0 };
    }
  },

  // Get followers list for a user
  async getFollowers(userId: string, currentUserId?: string): Promise<User[]> {
    try {
      console.log('🔍 getFollowers: Starting for userId:', userId, 'currentUserId:', currentUserId);
      debug.dbQuery('followers', 'SELECT', { userId });
      
      // First, let's test a simple query to see if we can access the followers table
      const { data: simpleData, error: simpleError } = await supabase
        .from('followers')
        .select('follower_id, following_id')
        .eq('following_id', userId);

      console.log('🔍 getFollowers: Simple query result - data:', simpleData, 'error:', simpleError);

      if (simpleError) {
        console.error('❌ getFollowers: Simple query failed:', simpleError);
        return [];
      }

      if (!simpleData || simpleData.length === 0) {
        console.log('🔍 getFollowers: No followers found in simple query');
        return [];
      }

      // Now try the full query with join
      const { data, error } = await supabase
        .from('followers')
        .select(`
          follower_id,
          user_profiles!followers_follower_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .eq('following_id', userId);

      console.log('🔍 getFollowers: Supabase response - data:', data, 'error:', error);

      if (error || !data) {
        console.error('❌ getFollowers: Database error or no data:', error);
        debug.dbError('followers', 'SELECT', error);
        return [];
      }

      console.log('🔍 getFollowers: Raw data from database:', data);
      debug.dbSuccess('followers', 'SELECT', { userId, count: data.length, rawData: data });

      const followers = (data as any[]).map((follower: any) => {
        console.log('🔍 getFollowers: Processing follower:', follower);
        
        // Handle case where user_profiles might be an array or single object
        const userProfile = Array.isArray(follower.user_profiles) 
          ? follower.user_profiles[0] 
          : follower.user_profiles;

        console.log('🔍 getFollowers: Extracted userProfile:', userProfile);

        if (!userProfile) {
          console.warn('No user profile found for follower:', follower.follower_id);
          return null;
        }

        const processedFollower = {
          id: userProfile.id,
          username: userProfile.username || userProfile.handle || '',
          avatar: userProfile.avatar || userProfile.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: userProfile.bio || '',
          location: userProfile.location || '',
          age: userProfile.age || 0,
          isHost: userProfile.is_host || false,
          hourlyRate: userProfile.hourly_rate || 0,
          totalChats: userProfile.total_chats || 0,
          responseTime: userProfile.response_time || '5 min',
          isFollowing: false, // Will be checked separately
          fullName: userProfile.full_name,
          handle: userProfile.handle,
          profilePicture: userProfile.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        };

        console.log('🔍 getFollowers: Processed follower:', processedFollower);
        return processedFollower;
      }).filter(Boolean) as User[];

      console.log('🔍 getFollowers: Final followers array:', followers);

      // Check follow status for current user if provided
      if (currentUserId && currentUserId !== userId) {
        console.log('🔍 getFollowers: Checking follow status for current user:', currentUserId);
        for (const follower of followers) {
          const isFollowing = await this.checkFollowStatus(currentUserId, follower.id);
          follower.isFollowing = isFollowing;
          console.log('🔍 getFollowers: Follow status for', follower.id, ':', isFollowing);
        }
      }

      console.log('🔍 getFollowers: Returning final result:', followers);
      return followers;
    } catch (error) {
      console.error('❌ getFollowers: Error fetching followers:', error);
      return [];
    }
  },

  // Get following list for a user
  async getFollowing(userId: string, currentUserId?: string): Promise<User[]> {
    try {
      console.log('🔍 getFollowing: Starting for userId:', userId, 'currentUserId:', currentUserId);
      debug.dbQuery('followers', 'SELECT', { userId, type: 'following' });
      
      // First, let's test a simple query to see if we can access the followers table
      const { data: simpleData, error: simpleError } = await supabase
        .from('followers')
        .select('follower_id, following_id')
        .eq('follower_id', userId);

      console.log('🔍 getFollowing: Simple query result - data:', simpleData, 'error:', simpleError);

      if (simpleError) {
        console.error('❌ getFollowing: Simple query failed:', simpleError);
        return [];
      }

      if (!simpleData || simpleData.length === 0) {
        console.log('🔍 getFollowing: No following found in simple query');
        return [];
      }

      // Now try the full query with join
      const { data, error } = await supabase
        .from('followers')
        .select(`
          following_id,
          user_profiles!followers_following_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .eq('follower_id', userId);

      console.log('🔍 getFollowing: Supabase response - data:', data, 'error:', error);

      if (error || !data) {
        console.error('❌ getFollowing: Database error or no data:', error);
        debug.dbError('followers', 'SELECT', error);
        return [];
      }

      console.log('🔍 getFollowing: Raw data from database:', data);
      debug.dbSuccess('followers', 'SELECT', { userId, count: data.length, type: 'following' });

      const following = (data as any[]).map((following: any) => {
        console.log('🔍 getFollowing: Processing following:', following);
        
        // Handle case where user_profiles might be an array or single object
        const userProfile = Array.isArray(following.user_profiles) 
          ? following.user_profiles[0] 
          : following.user_profiles;

        console.log('🔍 getFollowing: Extracted userProfile:', userProfile);

        if (!userProfile) {
          console.warn('No user profile found for following:', following.following_id);
          return null;
        }

        const processedFollowing = {
          id: userProfile.id,
          username: userProfile.username || userProfile.handle || '',
          avatar: userProfile.avatar || userProfile.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: userProfile.bio || '',
          location: userProfile.location || '',
          age: userProfile.age || 0,
          isHost: userProfile.is_host || false,
          hourlyRate: userProfile.hourly_rate || 0,
          totalChats: userProfile.total_chats || 0,
          responseTime: userProfile.response_time || '5 min',
          isFollowing: true, // They are being followed by the current user
          fullName: userProfile.full_name,
          handle: userProfile.handle,
          profilePicture: userProfile.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        };

        console.log('🔍 getFollowing: Processed following:', processedFollowing);
        return processedFollowing;
      }).filter(Boolean) as User[];

      console.log('🔍 getFollowing: Final following array:', following);

      // Check follow status for current user if provided and different from the profile owner
      if (currentUserId && currentUserId !== userId) {
        console.log('🔍 getFollowing: Checking follow status for current user:', currentUserId);
        for (const user of following) {
          const isFollowing = await this.checkFollowStatus(currentUserId, user.id);
          user.isFollowing = isFollowing;
          console.log('🔍 getFollowing: Follow status for', user.id, ':', isFollowing);
        }
      }

      console.log('🔍 getFollowing: Returning final result:', following);
      return following;
    } catch (error) {
      console.error('❌ getFollowing: Error fetching following:', error);
      return [];
    }
  },

  // Search users with advanced filtering
  async searchUsers(searchParams: {
    query?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    maxDistance?: number;
    minAge?: number;
    maxAge?: number;
    minRating?: number;
    maxPrice?: number;
    showHostsOnly?: boolean;
    showOnlineOnly?: boolean;
    roles?: string[];
    interests?: string[];
    currentUserId: string;
  }): Promise<User[]> {
    try {
      const startTime = Date.now();
      debug.searchStart(searchParams.query || 'all', searchParams);
      
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          username,
          handle,
          avatar,
          profile_picture,
          bio,
          location,
          age,
          is_host,
          hourly_rate,
          total_chats,
          response_time,
          full_name,
          gender,
          date_of_birth,
          is_verified,
          is_online,
          last_seen,
          rating,
          total_reviews,
          face_data,
          created_at,
          updated_at,
          interests,
          expertise,
          relationship_goals,
          looking_for,
          age_preference_min,
          age_preference_max,
          distance_preference,
          profile_completion_percentage,
          last_profile_update,
          latitude,
          longitude,
          location_updated_at,
          followers_count,
          following_count,
          community_trust_score
        `)
        .neq('id', searchParams.currentUserId); // Exclude current user

      // Text search
      if (searchParams.query) {
        const trimmedQuery = searchParams.query.trim();
        
        // Check if this looks like a username search
        const isUsernameSearch = trimmedQuery.startsWith('@') || 
          (trimmedQuery.length >= 3 && trimmedQuery.length <= 30 && !trimmedQuery.includes(' ') && /^[a-zA-Z0-9._]+$/.test(trimmedQuery));
        
        if (isUsernameSearch) {
          // For username search, prioritize exact username matches
          const usernameQuery = trimmedQuery.startsWith('@') ? trimmedQuery.substring(1) : trimmedQuery;
          query = query.or(`username.ilike.%${usernameQuery}%,handle.ilike.%${usernameQuery}%,full_name.ilike.%${usernameQuery}%`);
        } else {
          // For general search, search in name and bio
          query = query.or(`full_name.ilike.%${trimmedQuery}%,bio.ilike.%${trimmedQuery}%`);
        }
      }

      // Location search
      if (searchParams.location) {
        query = query.ilike('location', `%${searchParams.location}%`);
      }

      // Age filter
      if (searchParams.minAge || searchParams.maxAge) {
        if (searchParams.minAge && searchParams.maxAge) {
          query = query.gte('age', searchParams.minAge).lte('age', searchParams.maxAge);
        } else if (searchParams.minAge) {
          query = query.gte('age', searchParams.minAge);
        } else if (searchParams.maxAge) {
          query = query.lte('age', searchParams.maxAge);
        }
      }

      // Rating filter
      if (searchParams.minRating) {
        query = query.gte('rating', searchParams.minRating);
      }

      // Price filter
      if (searchParams.maxPrice) {
        query = query.lte('hourly_rate', searchParams.maxPrice);
      }

      // Host filter
      if (searchParams.showHostsOnly) {
        query = query.eq('is_host', true);
      }

      // Online filter
      if (searchParams.showOnlineOnly) {
        query = query.eq('is_online', true);
      }

      // Role filter
      if (searchParams.roles && searchParams.roles.length > 0) {
        query = query.in('looking_for', searchParams.roles);
      }

      // Interest filter
      if (searchParams.interests && searchParams.interests.length > 0) {
        query = query.overlaps('interests', searchParams.interests);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        debug.searchError(searchParams.query || 'all', error);
        return [];
      }

      if (!data || data.length === 0) {
        debugLogger.warn('DATABASE', 'SEARCH_USERS', 'No users found matching search criteria', searchParams);
        return [];
      }

      // Transform the data to match User interface
      const users: User[] = data.map(userData => {
        // Calculate distance if coordinates are provided
        let distanceKm: number | undefined;
        if (searchParams.latitude && searchParams.longitude && userData.latitude && userData.longitude) {
          distanceKm = calculateDistance(
            searchParams.latitude,
            searchParams.longitude,
            userData.latitude,
            userData.longitude
          );
        }

        // Filter by distance if specified
        if (searchParams.maxDistance && distanceKm && distanceKm > searchParams.maxDistance) {
          return null;
        }

        return {
          id: userData.id,
          username: userData.username || userData.handle || '',
          avatar: userData.avatar || userData.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: userData.bio || '',
          location: userData.location || '',
          age: userData.age || 0,
          isHost: userData.is_host || false,
          hourlyRate: userData.hourly_rate || 0,
          totalChats: userData.total_chats || 0,
          responseTime: userData.response_time || '5 min',
          isFollowing: false, // Will be checked separately if needed
          fullName: userData.full_name,
          handle: userData.handle,
          profilePicture: userData.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          gender: userData.gender,
          dateOfBirth: userData.date_of_birth,
          isVerified: userData.is_verified,
          isOnline: userData.is_online,
          lastSeen: userData.last_seen,
          rating: userData.rating,
          totalReviews: userData.total_reviews,
          faceData: userData.face_data,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
          interests: userData.interests || [],
          expertise: userData.expertise || [],
          relationshipGoals: userData.relationship_goals || [],
          lookingFor: userData.looking_for || 'Everyone',
          agePreferenceMin: userData.age_preference_min || 18,
          agePreferenceMax: userData.age_preference_max || 50,
          distancePreference: userData.distance_preference || 50,
          profileCompletionPercentage: userData.profile_completion_percentage || 0,
          lastProfileUpdate: userData.last_profile_update,
          latitude: userData.latitude,
          longitude: userData.longitude,
          locationUpdatedAt: userData.location_updated_at,
          followersCount: userData.followers_count || 0,
          followingCount: userData.following_count || 0,
          communityTrustScore: userData.community_trust_score || 0,
          distanceKm,
        };
      }).filter(Boolean) as User[];

      debug.searchComplete(searchParams.query || 'all', users, Date.now() - startTime);
      return users;
    } catch (error) {
      debugLogger.error('DATABASE', 'SEARCH_USERS', 'Exception occurred while searching users', error);
      return [];
    }
  },
};

// =====================================================
// POST OPERATIONS
// =====================================================

export const postService = {
  // Get all posts with user data (with caching)
  async getPosts(limit = 20, offset = 0, currentUserId?: string): Promise<Post[]> {
    try {
      // Check cache first for the first page
      if (offset === 0) {
        const cacheKey = `posts_${currentUserId || 'guest'}_${limit}`;
        const cachedPosts = await cacheService.get<Post[]>('posts', cacheKey);
        if (cachedPosts) {
          debug.cacheHit('posts', 'GET_POSTS', { cacheKey, count: cachedPosts.length });
          return cachedPosts;
        }
      }

      debug.dbQuery('posts', 'SELECT', { limit, offset, currentUserId });
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles!posts_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) return [];

      // Get like status for current user if provided
      let userLikes: Set<string> = new Set();
      if (currentUserId) {
        const postIds = data.map(post => post.id);
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds);
        
        if (likesData) {
          userLikes = new Set(likesData.map(like => like.post_id));
        }
      }

      const posts = data.map(post => ({
        id: post.id,
        user: {
          id: post.user_profiles.id,
          username: post.user_profiles.username || post.user_profiles.handle || '',
          avatar: post.user_profiles.avatar || post.user_profiles.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: post.user_profiles.bio || '',
          location: post.user_profiles.location || '',
          age: post.user_profiles.age || 0,
          isHost: post.user_profiles.is_host || false,
          hourlyRate: post.user_profiles.hourly_rate || 0,
          totalChats: post.user_profiles.total_chats || 0,
          responseTime: post.user_profiles.response_time || '5 min',
          isFollowing: false, // Will be checked separately
        },
        content: post.content,
        image: post.image_url,
        imageUrl: post.image_url,
        likes: post.likes_count || 0,
        likesCount: post.likes_count || 0,
        comments: post.comments_count || 0,
        commentsCount: post.comments_count || 0,
        isLiked: userLikes.has(post.id),
        isTrending: post.is_trending || false,
        timestamp: post.created_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));

      // Cache the first page results
      if (offset === 0) {
        const cacheKey = `posts_${currentUserId || 'guest'}_${limit}`;
        await cacheService.set('posts', cacheKey, posts);
        debug.cacheMiss('posts', 'GET_POSTS', { cacheKey, count: posts.length });
      }

      debug.dbSuccess('posts', 'SELECT', { count: posts.length });
      return posts;
    } catch (error) {
      debug.dbError('posts', 'SELECT', error);
      console.error('Error fetching posts:', error);
      return [];
    }
  },

  // Get posts from users that the current user follows (Feed)
  async getFeedPosts(currentUserId: string, limit = 20, offset = 0): Promise<Post[]> {
    try {
      debug.dbQuery('feed_posts', 'SELECT', { currentUserId, limit, offset });
      
      // First, get the users that the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (followingError) {
        debug.dbError('followers', 'SELECT', followingError);
        return [];
      }

      const followingIds = followingData?.map(f => f.following_id) || [];
      
      // If user doesn't follow anyone, return empty array
      if (followingIds.length === 0) {
        debug.dbSuccess('feed_posts', 'SELECT', { message: 'No following users found', count: 0 });
        return [];
      }

      // Get posts from followed users
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles!posts_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) {
        debug.dbError('posts', 'SELECT', error);
        return [];
      }

      // Get like status for current user
      let userLikes: Set<string> = new Set();
      const postIds = data.map(post => post.id);
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);
      
      if (likesData) {
        userLikes = new Set(likesData.map(like => like.post_id));
      }

      const posts = data.map(post => ({
        id: post.id,
        user: {
          id: post.user_profiles.id,
          username: post.user_profiles.username || post.user_profiles.handle || '',
          avatar: post.user_profiles.avatar || post.user_profiles.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: post.user_profiles.bio || '',
          location: post.user_profiles.location || '',
          age: post.user_profiles.age || 0,
          isHost: post.user_profiles.is_host || false,
          hourlyRate: post.user_profiles.hourly_rate || 0,
          totalChats: post.user_profiles.total_chats || 0,
          responseTime: post.user_profiles.response_time || '5 min',
          isFollowing: true, // User follows this post creator
        },
        content: post.content,
        image: post.image_url,
        imageUrl: post.image_url,
        likes: post.likes_count || 0,
        likesCount: post.likes_count || 0,
        comments: post.comments_count || 0,
        commentsCount: post.comments_count || 0,
        isLiked: userLikes.has(post.id),
        isTrending: post.is_trending || false,
        timestamp: post.created_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));

      debug.dbSuccess('feed_posts', 'SELECT', { count: posts.length, followingCount: followingIds.length });
      return posts;
    } catch (error) {
      debug.dbError('feed_posts', 'SELECT', { error: (error as Error).message });
      return [];
    }
  },

  // Create a new post
  async createPost(userId: string, content: string, imageUrl?: string, hashtags?: string[]): Promise<Post | null> {
    try {
      // Insert post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (postError || !post) return null;

      // Insert hashtags if provided
      if (hashtags && hashtags.length > 0) {
        await hashtagService.addHashtagsToPost(post.id, hashtags);
      }

      // Get user profile for the post
      const user = await userService.getUserProfile(userId);
      if (!user) return null;

      return {
        id: post.id,
        user,
        content: post.content,
        image: post.image_url,
        imageUrl: post.image_url,
        likes: 0,
        likesCount: 0,
        comments: 0,
        commentsCount: 0,
        isLiked: false,
        isTrending: false,
        timestamp: post.created_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        hashtags,
      };
    } catch (error) {
      console.error('Error creating post:', error);
      return null;
    }
  },

  // Get posts by user ID
  async getPostsByUser(userId: string, limit = 20, offset = 0, currentUserId?: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles!posts_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) return [];

      // Get like status for current user if provided
      let userLikes: Set<string> = new Set();
      if (currentUserId) {
        const postIds = data.map(post => post.id);
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds);
        
        if (likesData) {
          userLikes = new Set(likesData.map(like => like.post_id));
        }
      }

      return data.map(post => ({
        id: post.id,
        user: {
          id: post.user_profiles.id,
          username: post.user_profiles.username || post.user_profiles.handle || '',
          avatar: post.user_profiles.avatar || post.user_profiles.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          bio: post.user_profiles.bio || '',
          location: post.user_profiles.location || '',
          age: post.user_profiles.age || 0,
          isHost: post.user_profiles.is_host || false,
          hourlyRate: post.user_profiles.hourly_rate || 0,
          totalChats: post.user_profiles.total_chats || 0,
          responseTime: post.user_profiles.response_time || '5 min',
          isFollowing: false, // Will be checked separately
        },
        content: post.content,
        image: post.image_url,
        imageUrl: post.image_url,
        likes: post.likes_count || 0,
        likesCount: post.likes_count || 0,
        comments: post.comments_count || 0,
        commentsCount: post.comments_count || 0,
        isLiked: userLikes.has(post.id),
        isTrending: post.is_trending || false,
        timestamp: post.created_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  },

  // Like/unlike a post
  async togglePostLike(userId: string, postId: string): Promise<boolean> {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
        
        // Note: likes_count will be updated by database trigger or calculated on-demand
        
        return !error;
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            post_id: postId,
          });
        
        // Note: likes_count will be updated by database trigger or calculated on-demand
        
        return !error;
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      return false;
    }
  },

  // Get likes count for a post
  async getPostLikesCount(postId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) {
        console.error('Error getting likes count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting likes count:', error);
      return 0;
    }
  },

  // Get users who liked a post
  async getPostLikes(postId: string, currentUserId?: string): Promise<User[]> {
    try {
      console.log('Fetching likes for post:', postId);
      
      // First, get the likes for this post
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (likesError) {
        console.error('Supabase error fetching likes:', likesError);
        return [];
      }

      if (!likesData || likesData.length === 0) {
        console.log('No likes found for post:', postId);
        return [];
      }

      // Get user IDs from likes
      const userIds = likesData.map(like => like.user_id);
      console.log('User IDs who liked:', userIds);

      // Get user profiles for these users
      const { data: userProfiles, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time')
        .in('id', userIds);

      if (usersError) {
        console.error('Supabase error fetching user profiles:', usersError);
        return [];
      }

      console.log('User profiles found:', userProfiles);

      const users = userProfiles?.map(userProfile => ({
        id: userProfile.id,
        username: userProfile.username || userProfile.handle || '',
        avatar: userProfile.avatar || userProfile.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        age: userProfile.age || 0,
        isHost: userProfile.is_host || false,
        hourlyRate: userProfile.hourly_rate || 0,
        totalChats: userProfile.total_chats || 0,
        responseTime: userProfile.response_time || '5 min',
        isFollowing: false,
      })) || [];

      console.log('Final users array:', users);
      return users;
    } catch (error) {
      console.error('Error fetching post likes:', error);
      return [];
    }
  },

  // Delete a post
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      debug.dbQuery('posts', 'DELETE', { postId, userId });
      
      // First verify the user owns this post
      const { data: post, error: verifyError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .eq('user_id', userId)
        .single();

      if (verifyError || !post) {
        debug.dbError('posts', 'DELETE_VERIFY', { error: 'Post not found or user not authorized' });
        return false;
      }

      // Delete the post (CASCADE will handle related records)
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);

      if (deleteError) {
        debug.dbError('posts', 'DELETE', deleteError);
        return false;
      }

      debug.dbSuccess('posts', 'DELETE', { postId, userId });
      return true;
    } catch (error) {
      debug.dbError('posts', 'DELETE', { error: (error as Error).message });
      return false;
    }
  },
};

// =====================================================
// STORY OPERATIONS
// =====================================================

export const storyService = {
  // Get all stories with user data
  async getStories(): Promise<Story[]> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user_profiles!stories_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map(story => ({
        id: story.id,
        user: {
          id: story.user_profiles.id,
          username: story.user_profiles.username || story.user_profiles.handle || '',
          avatar: story.user_profiles.avatar || story.user_profiles.profile_picture || '',
          bio: story.user_profiles.bio || '',
          location: story.user_profiles.location || '',
          age: story.user_profiles.age || 0,
          isHost: story.user_profiles.is_host || false,
          hourlyRate: story.user_profiles.hourly_rate || 0,
          totalChats: story.user_profiles.total_chats || 0,
          responseTime: story.user_profiles.response_time || '5 min',
          isFollowing: false,
        },
        image: story.image_url || story.video_url,
        imageUrl: story.image_url,
        videoUrl: story.video_url,
        video: story.video_url,
        mediaType: story.media_type || (story.video_url ? 'video' : 'image'),
        aspectRatio: story.aspect_ratio || '9:16',
        isFullscreen: story.is_fullscreen !== undefined ? story.is_fullscreen : true,
        storyType: story.story_type || 'story',
        duration: story.duration || (story.video_url ? 30 : 0),
        expiresAt: story.expires_at,
        createdAt: story.created_at,
        viewCount: story.view_count || 0,
        likesCount: story.likes_count || 0,
        storySettings: {
          allowReplies: true,
          allowShares: true,
          visibility: 'public' as const
        },
        timestamp: new Date(story.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Error fetching stories:', error);
      return [];
    }
  },

  // Create a new story with support for both images and videos
  async createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video' = 'image', expiresInHours = 24): Promise<Story | null> {
    try {
      console.log('Creating story with parameters:', { userId, mediaUrl, mediaType, expiresInHours });
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Try enhanced approach first, fall back to basic if needed
      let storyData: any;
      let insertResult: any;
      
      // Enhanced approach with all new columns
      try {
        storyData = {
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          media_type: mediaType,
          is_fullscreen: true,
          aspect_ratio: '9:16',
          story_type: 'story',
          view_count: 0,
          likes_count: 0,
        };

        if (mediaType === 'video') {
          storyData.video_url = mediaUrl;
          storyData.duration = 30;
        } else {
          storyData.image_url = mediaUrl;
        }

        console.log('Attempting enhanced story creation with data:', storyData);
        
        insertResult = await supabase
          .from('stories')
          .insert(storyData)
          .select()
          .single();

        if (insertResult.error) {
          throw insertResult.error;
        }
      } catch (enhancedError) {
        console.log('Enhanced approach failed, trying basic approach:', enhancedError);
        
        // Fallback to basic approach (original columns only)
        storyData = {
          user_id: userId,
          expires_at: expiresAt.toISOString(),
        };

        // For basic approach, use image_url for both images and videos
        storyData.image_url = mediaUrl;

        console.log('Attempting basic story creation with data:', storyData);
        
        insertResult = await supabase
          .from('stories')
          .insert(storyData)
          .select()
          .single();
      }

      if (insertResult.error) {
        console.error('Story creation failed completely:', insertResult.error);
        console.error('Final story data attempted:', storyData);
        return null;
      }
      
      const story = insertResult.data;
      if (!story) {
        console.error('No story returned from database');
        return null;
      }

      console.log('Story created successfully:', story);

      const user = await userService.getUserProfile(userId);
      if (!user) {
        console.error('Failed to get user profile for story');
        return null;
      }

      // Build return object with safe field access
      const storyResult = {
        id: story.id,
        user,
        image: story.image_url || story.video_url || mediaUrl,
        imageUrl: story.image_url,
        videoUrl: story.video_url || (mediaType === 'video' ? mediaUrl : undefined),
        video: story.video_url || (mediaType === 'video' ? mediaUrl : undefined),
        mediaType: story.media_type || mediaType,
        aspectRatio: story.aspect_ratio || '9:16',
        isFullscreen: story.is_fullscreen !== undefined ? story.is_fullscreen : true,
        storyType: story.story_type || 'story',
        duration: story.duration || (mediaType === 'video' ? 30 : 0),
        expiresAt: story.expires_at,
        createdAt: story.created_at,
        viewCount: story.view_count || 0,
        likesCount: story.likes_count || 0,
        storySettings: {
          allowReplies: true,
          allowShares: true,
          visibility: 'public' as const
        },
        timestamp: new Date(story.created_at).getTime(),
      };

      console.log('Returning story result:', storyResult);
      return storyResult;
    } catch (error) {
      console.error('Error creating story:', error);
      return null;
    }
  },

  // Delete a story
  async deleteStory(storyId: string, userId: string): Promise<boolean> {
    try {
      console.log('Deleting story:', { storyId, userId });
      debugLogger.info('STORY', 'DELETE_START', `Deleting story: ${storyId}`);

      // First verify the story belongs to the user
      const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('user_id, image_url, video_url')
        .eq('id', storyId)
        .single();

      if (fetchError || !story) {
        console.error('Story not found:', fetchError);
        return false;
      }

      if (story.user_id !== userId) {
        console.error('User not authorized to delete this story');
        return false;
      }

      // Delete the story from database
      const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', userId); // Double-check ownership

      if (deleteError) {
        console.error('Failed to delete story:', deleteError);
        debugLogger.error('STORY', 'DELETE_ERROR', 'Failed to delete story from database', deleteError);
        return false;
      }

      // TODO: Optionally delete the media file from storage
      // This would require extracting the file path from the URL and calling storage delete
      
      debugLogger.info('STORY', 'DELETE_SUCCESS', `Story deleted successfully: ${storyId}`);
      console.log('Story deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting story:', error);
      debugLogger.error('STORY', 'DELETE_ERROR', 'Exception occurred while deleting story', error);
      return false;
    }
  },

  // Get stories for a specific user
  async getStoriesByUser(userId: string): Promise<any[]> {
    try {
      console.log('Getting stories for user:', userId);
      
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user_profiles!stories_user_id_fkey(
            id, username, handle, avatar, profile_picture
          )
        `)
        .eq('user_id', userId)
        .eq('is_archived', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user stories:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No stories found for user:', userId);
        return [];
      }

      // Map the data to the expected Story format
      const stories = data.map(story => ({
        id: story.id,
        user: {
          id: story.user_profiles?.id || userId,
          username: story.user_profiles?.username || 'Unknown',
          avatar: story.user_profiles?.avatar || story.user_profiles?.profile_picture || '',
          email: '',
          handle: story.user_profiles?.handle || story.user_profiles?.username || 'unknown',
          fullName: story.user_profiles?.username || 'Unknown User',
          bio: '',
          location: '',
          website: '',
          followers: 0,
          following: 0,
          posts: 0,
          isFollowing: false,
          isPrivate: false,
          isVerified: false,
          createdAt: new Date().toISOString()
        },
        image: story.image_url || story.media_url,
        imageUrl: story.image_url,
        videoUrl: story.video_url,
        video: story.video_url,
        mediaType: story.media_type || 'image',
        aspectRatio: story.aspect_ratio || '9:16',
        isFullscreen: story.is_fullscreen !== false,
        storyType: story.story_type || 'story',
        duration: story.duration || 0,
        expiresAt: story.expires_at,
        createdAt: story.created_at,
        viewCount: story.view_count || 0,
        likesCount: story.likes_count || 0,
        storySettings: {
          allowReplies: true,
          allowShares: true,
          visibility: 'public' as const
        },
        timestamp: new Date(story.created_at).getTime(),
      }));

      console.log(`Found ${stories.length} stories for user ${userId}`);
      return stories;
    } catch (error) {
      console.error('Error in getStoriesByUser:', error);
      return [];
    }
  },
};

// =====================================================
// REEL OPERATIONS
// =====================================================

export const reelService = {
  // Get all reels with user data (with caching)
  async getReels(limit = 20, offset = 0, currentUserId?: string): Promise<Reel[]> {
    try {
      // Check cache first for the first page
      if (offset === 0) {
        const cacheKey = `reels_${currentUserId || 'guest'}_${limit}`;
        const cachedReels = await cacheService.get<Reel[]>('reels', cacheKey);
        if (cachedReels) {
          debug.cacheHit('reels', 'GET_REELS', { cacheKey, count: cachedReels.length });
          return cachedReels;
        }
      }

      debug.dbQuery('reels', 'SELECT', { limit, offset, currentUserId });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      const userId = currentUserId || user?.id;
      
      if (authError) {
        debug.dbError('auth', 'GET_USER', authError);
        // Continue without user context for unauthenticated access
      }
      
      // Simple direct query - this was working before the likes fix
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          user_profiles!reels_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) return [];

      const reels = data.map(reel => ({
        id: reel.id,
        user: {
          id: reel.user_profiles.id,
          username: reel.user_profiles.username || reel.user_profiles.handle || '',
          avatar: reel.user_profiles.avatar || reel.user_profiles.profile_picture || '',
          bio: reel.user_profiles.bio || '',
          location: reel.user_profiles.location || '',
          age: reel.user_profiles.age || 0,
          isHost: reel.user_profiles.is_host || false,
          hourlyRate: reel.user_profiles.hourly_rate || 0,
          totalChats: reel.user_profiles.total_chats || 0,
          responseTime: reel.user_profiles.response_time || '5 min',
          isFollowing: false,
        },
        videoUrl: reel.video_url,
        caption: reel.caption || '',
        hashtags: reel.hashtags || [], // Now includes hashtags from database
        likes: reel.likes_count || 0,
        likesCount: reel.likes_count || 0,
        comments: reel.comments_count || 0,
        commentsCount: reel.comments_count || 0,
        shares: reel.shares_count || 0,
        sharesCount: reel.shares_count || 0,
        viewCount: reel.view_count || 0,
        isLiked: false, // No user context for unauthenticated users
        isSaved: false, // No user context for unauthenticated users
        // isViewed: false, // Removed - property doesn't exist in Reel type // No user context for unauthenticated users
        isTrending: (reel.likes_count || 0) > 1000 || (reel.view_count || 0) > 10000,
        duration: reel.duration || 0,
        location: reel.location || '',
        thumbnailUrl: reel.thumbnail_url,
        musicInfo: reel.music_title ? {
          title: reel.music_title,
          artist: reel.music_artist || '',
          coverUrl: reel.music_cover_url || '',
        } : undefined,
        musicTitle: reel.music_title,
        musicArtist: reel.music_artist,
        musicCoverUrl: reel.music_cover_url,
        timestamp: reel.created_at,
        createdAt: reel.created_at,
        updatedAt: reel.updated_at,
      }));

      // Cache the first page results
      if (offset === 0) {
        const cacheKey = `reels_${currentUserId || 'guest'}_${limit}`;
        await cacheService.set('reels', cacheKey, reels);
        debug.cacheMiss('reels', 'GET_REELS', { cacheKey, count: reels.length });
      }

      debug.dbSuccess('reels', 'SELECT', { count: reels.length });
      return reels;
    } catch (error) {
      debug.dbError('reels', 'SELECT', error);
      console.error('Error fetching reels:', error);
      return [];
    }
  },

  // Create a new reel
  async createReel(
    userId: string, 
    videoUrl: string, 
    caption: string, 
    duration: number,
    hashtags?: string[],
    musicInfo?: { title: string; artist: string; coverUrl: string },
    thumbnailUrl?: string
  ): Promise<Reel | null> {
    try {
      const { data: reel, error } = await supabase
        .from('reels')
        .insert({
          user_id: userId,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          caption,
          duration,
          music_title: musicInfo?.title,
          music_artist: musicInfo?.artist,
          music_cover_url: musicInfo?.coverUrl,
        })
        .select()
        .single();

      if (error || !reel) return null;

      // Insert hashtags if provided
      if (hashtags && hashtags.length > 0) {
        await hashtagService.addHashtagsToReel(reel.id, hashtags);
      }

      const user = await userService.getUserProfile(userId);
      if (!user) return null;

      return {
        id: reel.id,
        user,
        videoUrl: reel.video_url,
        thumbnailUrl: reel.thumbnail_url,
        caption: reel.caption || '',
        hashtags: hashtags || [],
        likes: 0,
        likesCount: 0,
        comments: 0,
        commentsCount: 0,
        shares: 0,
        sharesCount: 0,
        isLiked: false,
        isSaved: false,
        // isViewed: false, // Removed - property doesn't exist in Reel type
        duration: reel.duration || 0,
        musicInfo: musicInfo,
        musicTitle: reel.music_title,
        musicArtist: reel.music_artist,
        musicCoverUrl: reel.music_cover_url,
        timestamp: reel.created_at,
        createdAt: reel.created_at,
        updatedAt: reel.updated_at,
      };
    } catch (error) {
      console.error('Error creating reel:', error);
      return null;
    }
  },

  // Toggle reel like
  async toggleLike(reelId: string, userId?: string): Promise<boolean> {
    try {
      debug.dbQuery('reel_likes', 'TOGGLE', { reelId, userId });
      
      // Get current user if not provided
      if (!userId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          debug.dbError('reel_likes', 'TOGGLE', { error: 'No authenticated user' });
          return false;
        }
        userId = user.id;
      }

      // Use the simple toggle function
      const { data, error } = await supabase
        .rpc('toggle_reel_like_simple', { 
          p_reel_id: reelId, 
          p_user_id: userId 
        });

      if (error) throw error;
      debug.dbSuccess('reel_likes', 'TOGGLE', { isLiked: data });
      return data;
    } catch (error) {
      debug.dbError('reel_likes', 'TOGGLE', { error: (error as Error).message });
      return false;
    }
  },

  // Toggle reel save
  async toggleSave(reelId: string): Promise<boolean> {
    try {
      debug.dbQuery('reel_saves', 'TOGGLE', { reelId });
      const { data, error } = await supabase
        .rpc('toggle_reel_save', { p_reel_id: reelId });

      if (error) throw error;
      debug.dbSuccess('reel_saves', 'TOGGLE', { isSaved: data });
      return data;
    } catch (error) {
      debug.dbError('reel_saves', 'TOGGLE', { error: (error as Error).message });
      return false;
    }
  },

  // Increment reel view count (only once per user)
  async incrementView(reelId: string): Promise<boolean> {
    try {
      debug.dbQuery('reels', 'INCREMENT_VIEW', { reelId });
      const { data, error } = await supabase
        .rpc('increment_reel_view', { p_reel_id: reelId });

      if (error) throw error;
      
      const wasNewView = data === true;
      debug.dbSuccess('reels', 'INCREMENT_VIEW', { reelId, wasNewView });
      return wasNewView;
    } catch (error) {
      debug.dbError('reels', 'INCREMENT_VIEW', { error: (error as Error).message });
      return false;
    }
  },

  // Check if user has viewed a reel
  async hasUserViewedReel(reelId: string): Promise<boolean> {
    try {
      debug.dbQuery('reels', 'CHECK_VIEW_STATUS', { reelId });
      const { data, error } = await supabase
        .rpc('get_user_reel_view_status', { p_reel_id: reelId });

      if (error) throw error;
      debug.dbSuccess('reels', 'CHECK_VIEW_STATUS', { reelId, hasViewed: data });
      return data === true;
    } catch (error) {
      debug.dbError('reels', 'CHECK_VIEW_STATUS', { error: (error as Error).message });
      return false;
    }
  },

  // Share reel
  async shareReel(reelId: string, shareType: 'internal' | 'external' | 'story' = 'internal', platform?: string): Promise<boolean> {
    try {
      debug.dbQuery('reel_shares', 'CREATE', { reelId, shareType, platform });
      const { error } = await supabase
        .from('reel_shares')
        .insert([{
          reel_id: reelId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          share_type: shareType,
          platform,
        }]);

      if (error) throw error;
      debug.dbSuccess('reel_shares', 'CREATE', { reelId });
      return true;
    } catch (error) {
      debug.dbError('reel_shares', 'CREATE', { error: (error as Error).message });
      return false;
    }
  },

  // Get user's reels
  async getUserReels(userId: string, limit: number = 20, offset: number = 0, currentUserId?: string): Promise<Reel[]> {
    try {
      debug.dbQuery('user_reels', 'GET', { userId, limit, offset });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      const viewerUserId = currentUserId || user?.id;
      
      if (authError) {
        debug.dbError('auth', 'GET_USER', authError);
        // Continue without user context for unauthenticated access
      }
      
      // Get reels data
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          user_profiles!inner(username, avatar, bio, location, age, is_host, hourly_rate, total_chats, response_time),
          reel_music(title, artist, cover_url, duration)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      // Get like status for viewer if authenticated
      let userLikes: Set<string> = new Set();
      if (viewerUserId && data?.length) {
        const reelIds = data.map(reel => reel.id);
        const { data: likesData } = await supabase
          .from('likes')
          .select('reel_id')
          .eq('user_id', viewerUserId)
          .in('reel_id', reelIds);
        
        if (likesData) {
          userLikes = new Set(likesData.map(like => like.reel_id));
        }
      }
      
      const transformedReels: Reel[] = (data || []).map((reel: any) => ({
        id: reel.id,
        user: {
          id: reel.user_id,
          username: reel.user_profiles.username,
          avatar: reel.user_profiles.avatar,
          bio: reel.user_profiles.bio,
          location: reel.user_profiles.location,
          age: reel.user_profiles.age,
          isHost: reel.user_profiles.is_host,
          hourlyRate: reel.user_profiles.hourly_rate,
          totalChats: reel.user_profiles.total_chats,
          responseTime: reel.user_profiles.response_time,
          isFollowing: false,
        },
        videoUrl: reel.video_url,
        caption: reel.caption,
        hashtags: reel.hashtags || [],
        likes: reel.likes_count,
        comments: reel.comments_count,
        shares: reel.shares_count,
        isLiked: userLikes.has(reel.id),
        isSaved: false, // Would need to check separately
        duration: reel.duration,
        musicInfo: reel.reel_music?.[0] ? {
          title: reel.reel_music[0].title,
          artist: reel.reel_music[0].artist,
          coverUrl: reel.reel_music[0].cover_url,
        } : undefined,
        timestamp: formatTimestamp(reel.created_at),
      }));

      debug.dbSuccess('user_reels', 'GET', { count: transformedReels.length });
      return transformedReels;
    } catch (error) {
      debug.dbError('user_reels', 'GET', { error: (error as Error).message });
      return [];
    }
  },

  // Get trending reels based on engagement
  async getTrendingReels(limit = 20, offset = 0, currentUserId?: string): Promise<Reel[]> {
    try {
      debug.dbQuery('reels', 'TRENDING_SELECT', { limit, offset });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      const userId = currentUserId || user?.id;
      
      if (authError) {
        debug.dbError('auth', 'GET_USER', authError);
        // Continue without user context for unauthenticated access
      }
      
      // Temporarily use fallback for everyone until RPC functions are fixed
      // TODO: Re-enable RPC function once database is updated
      /*
      if (userId) {
        const { data, error } = await supabase.rpc('get_reels_for_user', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

        if (error || !data) {
          debug.dbError('reels', 'TRENDING_SELECT', error);
          return [];
        }

        // Filter and sort for trending (last 7 days, high engagement)
        const trendingReels = data
          .filter(reel => {
            const reelDate = new Date(reel.created_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return reelDate >= weekAgo;
          })
          .sort((a: any, b: any) => {
            // Sort by engagement score (likes + views)
            const scoreA = (a.likes_count || 0) + (a.view_count || 0) * 0.1;
            const scoreB = (b.likes_count || 0) + (b.view_count || 0) * 0.1;
            return scoreB - scoreA;
          })
          .slice(0, limit);

        debug.dbSuccess('reels', 'TRENDING_SELECT', { count: trendingReels.length });

        return trendingReels.map((reel: any) => ({
          id: reel.id,
          user: {
            id: reel.user_id,
            username: reel.username || '',
            avatar: reel.avatar || '',
            bio: reel.bio || '',
            location: '',
            age: 0,
            isHost: false,
            hourlyRate: 0,
            totalChats: 0,
            responseTime: '5 min',
            isFollowing: false,
          },
          videoUrl: reel.video_url,
          caption: reel.caption || '',
          hashtags: reel.hashtags || [],
          likes: reel.likes_count || 0,
          likesCount: reel.likes_count || 0,
          comments: reel.comments_count || 0,
          commentsCount: reel.comments_count || 0,
          shares: reel.shares_count || 0,
          sharesCount: reel.shares_count || 0,
          viewCount: reel.view_count || 0,
          isLiked: reel.is_liked || false,
          isSaved: reel.is_saved || false,
          isViewed: reel.is_viewed || false,
          isTrending: true, // These are trending by definition
          duration: reel.duration || 0,
          location: reel.location || '',
          thumbnailUrl: reel.thumbnail_url,
          musicInfo: reel.music_title ? {
            title: reel.music_title,
            artist: reel.music_artist || '',
            coverUrl: reel.music_cover_url || '',
          } : undefined,
          createdAt: reel.created_at,
          timestamp: reel.created_at,
        }));
      }
      */

      // Fallback for unauthenticated users
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          user_profiles!reels_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .order('likes_count', { ascending: false })
        .order('view_count', { ascending: false })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .range(offset, offset + limit - 1);

      if (error || !data) {
        debug.dbError('reels', 'TRENDING_SELECT', error);
        return [];
      }

      debug.dbSuccess('reels', 'TRENDING_SELECT', { count: data.length });
      
      return data.map(reel => ({
        id: reel.id,
        user: {
          id: reel.user_profiles.id,
          username: reel.user_profiles.username || reel.user_profiles.handle || '',
          avatar: reel.user_profiles.avatar || reel.user_profiles.profile_picture || '',
          bio: reel.user_profiles.bio || '',
          location: reel.user_profiles.location || '',
          age: reel.user_profiles.age || 0,
          isHost: reel.user_profiles.is_host || false,
          hourlyRate: reel.user_profiles.hourly_rate || 0,
          totalChats: reel.user_profiles.total_chats || 0,
          responseTime: reel.user_profiles.response_time || '5 min',
          isFollowing: false,
        },
        videoUrl: reel.video_url,
        caption: reel.caption || '',
        hashtags: reel.hashtags || [],
        likes: reel.likes_count || 0,
        likesCount: reel.likes_count || 0,
        comments: reel.comments_count || 0,
        commentsCount: reel.comments_count || 0,
        shares: reel.shares_count || 0,
        sharesCount: reel.shares_count || 0,
        viewCount: reel.view_count || 0,
        isLiked: false,
        isSaved: false,
        // isViewed: false, // Removed - property doesn't exist in Reel type
        isTrending: true, // These are trending by definition
        duration: reel.duration || 0,
        location: reel.location || '',
        thumbnailUrl: reel.thumbnail_url,
        musicInfo: reel.music_title ? {
          title: reel.music_title,
          artist: reel.music_artist || '',
          coverUrl: reel.music_cover_url || '',
        } : undefined,
        musicTitle: reel.music_title,
        musicArtist: reel.music_artist,
        musicCoverUrl: reel.music_cover_url,
        timestamp: reel.created_at,
        createdAt: reel.created_at,
        updatedAt: reel.updated_at,
      }));
    } catch (error) {
      debug.dbError('reels', 'TRENDING_SELECT', { error: (error as Error).message });
      return [];
    }
  },

  // Get reels by hashtags
  async getReelsByHashtags(hashtags: string[], limit = 20, offset = 0): Promise<Reel[]> {
    try {
      debug.dbQuery('reels', 'HASHTAG_SELECT', { hashtags, limit, offset });
      
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          user_profiles!reels_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .overlaps('hashtags', hashtags)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) {
        debug.dbError('reels', 'HASHTAG_SELECT', error);
        return [];
      }

      debug.dbSuccess('reels', 'HASHTAG_SELECT', { count: data.length, hashtags });
      
      return data.map(reel => ({
        id: reel.id,
        user: {
          id: reel.user_profiles.id,
          username: reel.user_profiles.username || reel.user_profiles.handle || '',
          avatar: reel.user_profiles.avatar || reel.user_profiles.profile_picture || '',
          bio: reel.user_profiles.bio || '',
          location: reel.user_profiles.location || '',
          age: reel.user_profiles.age || 0,
          isHost: reel.user_profiles.is_host || false,
          hourlyRate: reel.user_profiles.hourly_rate || 0,
          totalChats: reel.user_profiles.total_chats || 0,
          responseTime: reel.user_profiles.response_time || '5 min',
          isFollowing: false,
        },
        videoUrl: reel.video_url,
        caption: reel.caption || '',
        hashtags: reel.hashtags || [],
        likes: reel.likes_count || 0,
        likesCount: reel.likes_count || 0,
        comments: reel.comments_count || 0,
        commentsCount: reel.comments_count || 0,
        shares: reel.shares_count || 0,
        sharesCount: reel.shares_count || 0,
        viewCount: reel.view_count || 0,
        isLiked: false,
        isSaved: false,
        // isViewed: false, // Removed - property doesn't exist in Reel type
        isTrending: (reel.likes_count || 0) > 1000 || (reel.view_count || 0) > 10000,
        duration: reel.duration || 0,
        location: reel.location || '',
        thumbnailUrl: reel.thumbnail_url,
        musicInfo: reel.music_title ? {
          title: reel.music_title,
          artist: reel.music_artist || '',
          coverUrl: reel.music_cover_url || '',
        } : undefined,
        musicTitle: reel.music_title,
        musicArtist: reel.music_artist,
        musicCoverUrl: reel.music_cover_url,
        timestamp: reel.created_at,
        createdAt: reel.created_at,
        updatedAt: reel.updated_at,
      }));
    } catch (error) {
      debug.dbError('reels', 'HASHTAG_SELECT', { error: (error as Error).message });
      return [];
    }
  },

  // Delete a reel
  async deleteReel(reelId: string, userId: string): Promise<boolean> {
    try {
      debug.dbQuery('reels', 'DELETE', { reelId, userId });
      
      // First verify the user owns this reel
      const { data: reel, error: verifyError } = await supabase
        .from('reels')
        .select('user_id')
        .eq('id', reelId)
        .eq('user_id', userId)
        .single();

      if (verifyError || !reel) {
        debug.dbError('reels', 'DELETE_VERIFY', { error: 'Reel not found or user not authorized' });
        return false;
      }

      // Delete the reel (CASCADE will handle related records)
      const { error: deleteError } = await supabase
        .from('reels')
        .delete()
        .eq('id', reelId)
        .eq('user_id', userId);

      if (deleteError) {
        debug.dbError('reels', 'DELETE', deleteError);
        return false;
      }

      debug.dbSuccess('reels', 'DELETE', { reelId, userId });
      return true;
    } catch (error) {
      debug.dbError('reels', 'DELETE', { error: (error as Error).message });
      return false;
    }
  },

  // Get reels by user
  async getReelsByUser(userId: string, limit = 20, offset = 0): Promise<Reel[]> {
    try {
      debug.dbQuery('reels', 'USER_SELECT', { userId, limit, offset });
      
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          user_profiles!reels_user_id_fkey (
            id, full_name, handle, username, avatar, profile_picture, bio, location, age, is_host, hourly_rate, total_chats, response_time
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) {
        debug.dbError('reels', 'USER_SELECT', error);
        return [];
      }

      debug.dbSuccess('reels', 'USER_SELECT', { count: data.length, userId });
      
      return data.map(reel => ({
        id: reel.id,
        user: {
          id: reel.user_profiles.id,
          username: reel.user_profiles.username || reel.user_profiles.handle || '',
          avatar: reel.user_profiles.avatar || reel.user_profiles.profile_picture || '',
          bio: reel.user_profiles.bio || '',
          location: reel.user_profiles.location || '',
          age: reel.user_profiles.age || 0,
          isHost: reel.user_profiles.is_host || false,
          hourlyRate: reel.user_profiles.hourly_rate || 0,
          totalChats: reel.user_profiles.total_chats || 0,
          responseTime: reel.user_profiles.response_time || '5 min',
          isFollowing: false,
        },
        videoUrl: reel.video_url,
        caption: reel.caption || '',
        hashtags: reel.hashtags || [],
        likes: reel.likes_count || 0,
        likesCount: reel.likes_count || 0,
        comments: reel.comments_count || 0,
        commentsCount: reel.comments_count || 0,
        shares: reel.shares_count || 0,
        sharesCount: reel.shares_count || 0,
        viewCount: reel.view_count || 0,
        isLiked: false,
        isSaved: false,
        // isViewed: false, // Removed - property doesn't exist in Reel type
        isTrending: (reel.likes_count || 0) > 1000 || (reel.view_count || 0) > 10000,
        duration: reel.duration || 0,
        location: reel.location || '',
        thumbnailUrl: reel.thumbnail_url,
        musicInfo: reel.music_title ? {
          title: reel.music_title,
          artist: reel.music_artist || '',
          coverUrl: reel.music_cover_url || '',
        } : undefined,
        musicTitle: reel.music_title,
        musicArtist: reel.music_artist,
        musicCoverUrl: reel.music_cover_url,
        timestamp: reel.created_at,
        createdAt: reel.created_at,
        updatedAt: reel.updated_at,
      }));
    } catch (error) {
      debug.dbError('reels', 'USER_SELECT', { error: (error as Error).message });
      return [];
    }
  },
};

// =====================================================
// HASHTAG OPERATIONS
// =====================================================

export const hashtagService = {
  // Add hashtags to a post
  async addHashtagsToPost(postId: string, hashtagNames: string[]): Promise<boolean> {
    try {
      for (const hashtagName of hashtagNames) {
        // Get or create hashtag
        let { data: hashtag } = await supabase
          .from('hashtags')
          .select('id')
          .eq('name', hashtagName)
          .single();

        if (!hashtag) {
          const { data: newHashtag } = await supabase
            .from('hashtags')
            .insert({ name: hashtagName })
            .select('id')
            .single();
          hashtag = newHashtag;
        }

        if (hashtag) {
          // Add hashtag to post
          await supabase
            .from('post_hashtags')
            .insert({
              post_id: postId,
              hashtag_id: hashtag.id,
            });
        }
      }
      return true;
    } catch (error) {
      console.error('Error adding hashtags to post:', error);
      return false;
    }
  },

  // Add hashtags to a reel
  async addHashtagsToReel(reelId: string, hashtagNames: string[]): Promise<boolean> {
    try {
      for (const hashtagName of hashtagNames) {
        // Get or create hashtag
        let { data: hashtag } = await supabase
          .from('hashtags')
          .select('id')
          .eq('name', hashtagName)
          .single();

        if (!hashtag) {
          const { data: newHashtag } = await supabase
            .from('hashtags')
            .insert({ name: hashtagName })
            .select('id')
            .single();
          hashtag = newHashtag;
        }

        if (hashtag) {
          // Add hashtag to reel
          await supabase
            .from('reel_hashtags')
            .insert({
              reel_id: reelId,
              hashtag_id: hashtag.id,
            });
        }
      }
      return true;
    } catch (error) {
      console.error('Error adding hashtags to reel:', error);
      return false;
    }
  },
};

// =====================================================
// REVIEW OPERATIONS
// =====================================================

export const reviewService = {
  // Get reviews for a user
  async getUserReviews(userId: string, currentUserId?: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_reviews', {
          target_user_id: userId,
          current_user_id: currentUserId || null
        });

      if (error || !data) return [];

      return (data as any[]).map((review: any) => ({
        id: review.review_id,
        reviewerId: review.reviewer_id,
        reviewedId: userId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        // Additional fields for UI
        reviewerName: review.reviewer_name,
        reviewerAvatar: review.reviewer_avatar,
        canDelete: review.can_delete,
      }));
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      return [];
    }
  },

  // Create a new review
  async createReview(reviewData: {
    reviewerId: string;
    reviewedId: string;
    rating: number;
    comment?: string;
    bookingId?: string;
  }): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: reviewData.reviewerId,
          reviewed_id: reviewData.reviewedId,
          rating: reviewData.rating,
          comment: reviewData.comment,
          booking_id: reviewData.bookingId,
        })
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        reviewerId: data.reviewer_id,
        reviewedId: data.reviewed_id,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error creating review:', error);
      return null;
    }
  },

  // Delete a review (only by the reviewer)
  async deleteReview(reviewId: string, reviewerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', reviewerId);

      return !error;
    } catch (error) {
      console.error('Error deleting review:', error);
      return false;
    }
  },

  // Check if user has already reviewed another user
  async hasUserReviewed(reviewerId: string, reviewedId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', reviewerId)
        .eq('reviewed_id', reviewedId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  },
};

// =====================================================
// HOST PROFILE OPERATIONS
// =====================================================

export const hostService = {
  // Get host profile
  async getHostProfile(userId: string): Promise<HostProfile | null> {
    try {
      const { data, error } = await supabase
        .from('host_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        description: data.description,
        relationshipRoles: data.relationship_roles || [],
        interests: data.interests || [],
        expertise: data.expertise || [],
        priceCategory: data.price_category,
        isApproved: data.is_approved,
        approvalDate: data.approval_date,
        rejectionReason: data.rejection_reason,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching host profile:', error);
      return null;
    }
  },

  // Create or update host profile
  async createHostProfile(hostData: Partial<HostProfile>): Promise<boolean> {
    try {
      console.log('🔧 Creating host profile for user:', hostData.userId);
      console.log('🔧 Host data:', hostData);
      
      const { data, error } = await supabase
        .from('host_profiles')
        .insert({
          user_id: hostData.userId,
          description: hostData.description,
          relationship_roles: hostData.relationshipRoles,
          interests: hostData.interests,
          expertise: hostData.expertise,
          price_category: hostData.priceCategory,
          is_approved: hostData.isApproved || false,
        })
        .select();

      if (error) {
        console.error('❌ Host profile creation error:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return false;
      }

      console.log('✅ Host profile created successfully:', data);
      return true;
    } catch (error) {
      console.error('💥 Host profile creation exception:', error);
      return false;
    }
  },
};

// =====================================================
// STORAGE OPERATIONS
// =====================================================

export const storageService = {
  // Upload image to specific bucket
  async uploadImage(
    file: { uri: string; type?: string; name?: string },
    bucket: 'avatars' | 'posts' | 'stories' | 'reels' | 'user-media',
    userId: string,
    options: {
      folder?: string;
      quality?: number;
      resize?: { width: number; height: number };
    } = {}
  ): Promise<{ url: string; path: string } | null> {
    try {
      const startTime = Date.now();
      debug.apiCall('storage', 'uploadImage', { bucket, userId, file: file.name });
      
      // Validate inputs
      if (!file.uri || !userId) {
        throw new Error('Missing required parameters: file.uri or userId');
      }
      
      debugLogger.info('STORAGE', 'UPLOAD_IMAGE_START', `Starting upload: ${file.name || 'unnamed'} to ${bucket}`);
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name?.split('.').pop() || 'jpg';
      const folder = options.folder || 'uploads';
      const fileName = `${userId}/${folder}/${timestamp}.${extension}`;

      // Convert file URI to binary data
      debugLogger.info('STORAGE', 'UPLOAD_IMAGE_READ', `Reading file from: ${file.uri}`);
      const uint8Array = await readUriToUint8Array(file.uri);
      
      // Validate file size
      if (uint8Array.byteLength === 0) {
        throw new Error('File is empty (0 bytes)');
      }
      
      debugLogger.info('STORAGE', 'UPLOAD_IMAGE_READY', `File read successfully: ${uint8Array.byteLength} bytes`);

      // Upload to Supabase storage using Uint8Array
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, uint8Array, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (error) {
        debug.apiError('storage', 'uploadImage', error);
        debugLogger.error('STORAGE', 'UPLOAD_IMAGE', 'Image upload failed', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from upload');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      debug.apiSuccess('storage', 'uploadImage', { url: publicUrl, path: fileName }, Date.now() - startTime);
      debugLogger.info('STORAGE', 'UPLOAD_SUCCESS', `Image uploaded successfully: ${publicUrl} (${uint8Array.byteLength} bytes)`);
      
      return { url: publicUrl, path: fileName };
    } catch (error) {
      debugLogger.error('STORAGE', 'UPLOAD_IMAGE', 'Exception occurred during image upload', error);
      return null;
    }
  },

  // Upload video to specific bucket
  async uploadVideo(
    file: { uri: string; type?: string; name?: string },
    bucket: 'reels' | 'stories' | 'user-media',
    userId: string,
    options: {
      folder?: string;
      maxDuration?: number;
    } = {}
  ): Promise<{ url: string; path: string } | null> {
    try {
      const startTime = Date.now();
      debug.apiCall('storage', 'uploadVideo', { bucket, userId, file: file.name });
      
      // Validate inputs
      if (!file.uri || !userId) {
        throw new Error('Missing required parameters: file.uri or userId');
      }
      
      debugLogger.info('STORAGE', 'UPLOAD_VIDEO_START', `Starting upload: ${file.name || 'unnamed'} to ${bucket}`);
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name?.split('.').pop() || 'mp4';
      const folder = options.folder || 'videos';
      const fileName = `${userId}/${folder}/${timestamp}.${extension}`;

      // Convert file URI to binary data
      debugLogger.info('STORAGE', 'UPLOAD_VIDEO_READ', `Reading file from: ${file.uri}`);
      const uint8Array = await readUriToUint8Array(file.uri);
      
      // Validate file size
      if (uint8Array.byteLength === 0) {
        throw new Error('Video file is empty (0 bytes)');
      }
      
      debugLogger.info('STORAGE', 'UPLOAD_VIDEO_READY', `File read successfully: ${uint8Array.byteLength} bytes`);

      // Upload using Uint8Array to avoid 0-byte issues on native
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, uint8Array, {
          contentType: file.type || 'video/mp4',
          upsert: true,
        });

      if (error) {
        debug.apiError('storage', 'uploadVideo', error);
        debugLogger.error('STORAGE', 'UPLOAD_VIDEO', 'Video upload failed', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from video upload');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      debug.apiSuccess('storage', 'uploadVideo', { url: publicUrl, path: fileName }, Date.now() - startTime);
      debugLogger.info('STORAGE', 'UPLOAD_SUCCESS', `Video uploaded successfully: ${publicUrl} (${uint8Array.byteLength} bytes)`);
      
      return { url: publicUrl, path: fileName };
    } catch (error) {
      debugLogger.error('STORAGE', 'UPLOAD_VIDEO', 'Exception occurred during video upload', error);
      return null;
    }
  },

  // Delete file from storage
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      debug.apiCall('storage', 'deleteFile', { bucket, path });
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        debug.apiError('storage', 'deleteFile', error);
        debugLogger.error('STORAGE', 'DELETE_FILE', 'File deletion failed', error);
        return false;
      }

      debug.apiSuccess('storage', 'deleteFile', { bucket, path }, Date.now() - startTime);
      debugLogger.info('STORAGE', 'DELETE_SUCCESS', `File deleted successfully: ${path}`);
      
      return true;
    } catch (error) {
      debugLogger.error('STORAGE', 'DELETE_FILE', 'Exception occurred during file deletion', error);
      return false;
    }
  },

  // Get user's media files
  async getUserMedia(userId: string, type: 'images' | 'videos' | 'all' = 'all'): Promise<Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    name: string;
    size: number;
    createdAt: string;
    bucket: string;
    path: string;
  }>> {
    try {
      const startTime = Date.now();
      debug.dbQuery('storage.objects', 'SELECT', { userId, type });
      debugLogger.info('STORAGE', 'GET_USER_MEDIA_START', `Fetching media for user: ${userId}, type: ${type}`);
      
      // Query storage objects for the user
      const { data, error } = await supabase.storage
        .from('user-media')
        .list(`${userId}/`, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        debug.dbError('storage.objects', 'SELECT', error);
        debugLogger.error('STORAGE', 'GET_USER_MEDIA', 'Failed to fetch user media', error);
        return [];
      }

      if (!data || data.length === 0) {
        debugLogger.info('STORAGE', 'GET_USER_MEDIA', `No media files found for user: ${userId}`);
        return [];
      }

      const mediaFiles = data
        .filter(file => {
          if (type === 'images') return file.metadata?.mimetype?.startsWith('image/');
          if (type === 'videos') return file.metadata?.mimetype?.startsWith('video/');
          return true;
        })
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('user-media')
            .getPublicUrl(`${userId}/${file.name}`);

          return {
            id: file.id || file.name,
            url: publicUrl,
            type: file.metadata?.mimetype?.startsWith('video/') ? 'video' as const : 'image' as const,
            name: file.name,
            size: file.metadata?.size || 0,
            createdAt: file.created_at || new Date().toISOString(),
            bucket: 'user-media',
            path: `${userId}/${file.name}`,
          };
        });

      debug.dbSuccess('storage.objects', 'SELECT', { userId, count: mediaFiles.length }, Date.now() - startTime);
      debugLogger.info('STORAGE', 'GET_USER_MEDIA_SUCCESS', `Found ${mediaFiles.length} media files for user: ${userId}`);
      
      return mediaFiles;
    } catch (error) {
      debugLogger.error('STORAGE', 'GET_USER_MEDIA', 'Exception occurred while fetching user media', error);
      return [];
    }
  },
};

// =====================================================
// COMMENT OPERATIONS
// =====================================================

// Helper function to format timestamp
const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const commentTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return commentTime.toLocaleDateString();
};

export const commentService = {
  // Get comments for a post
  async getComments(postId: string, postType: 'feed' | 'reel' = 'feed'): Promise<Comment[]> {
    try {
      const startTime = Date.now();
      debug.dbQuery('comments', 'SELECT', { postId });
      
      let data, error;
      
      // Use specific reel comment function for reels
      if (postType === 'reel') {
        const result = await supabase.rpc('get_reel_comments', {
          p_reel_id: postId,
          p_limit: 50,
          p_offset: 0
        });
        data = result.data;
        error = result.error;
      } else {
        // For posts, try the view first, if it doesn't exist, fall back to direct table query
        const result = await supabase
          .from('comments_with_users')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        data = result.data;
        error = result.error;
      }

      if (error && error.code === '42P01' && postType === 'feed') {
        // View doesn't exist, use direct table query
        console.log('comments_with_users view not found, using direct table query');
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            user:user_profiles(id, username, avatar)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (commentsError) {
          debug.dbError('comments', 'SELECT', commentsError);
          return [];
        }

        data = commentsData;
      } else if (error) {
        debug.dbError('comments_with_users', 'SELECT', error);
        return [];
      }
      
      // Transform data to match Comment interface
      const comments = (data || []).map((comment: any) => {
        // Handle both view and direct table query formats
        const userData = comment.user || {
          id: comment.user_id,
          username: comment.username,
          avatar: comment.avatar
        };
        
        return {
          id: comment.id,
          postId: comment.post_id,
          postType: postType,
          userId: comment.user_id,
          user: {
            id: userData.id,
            username: userData.username,
            avatar: userData.avatar
          },
          content: comment.content,
          parentId: comment.parent_id,
          likesCount: comment.likes_count,
          isLiked: comment.is_liked_by_current_user || comment.is_liked || false,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at
        };
      });

      debug.dbSuccess('comments_with_users', 'SELECT', { postId, count: comments.length }, Date.now() - startTime);
      return comments;
    } catch (error) {
      debugLogger.error('DATABASE', 'GET_COMMENTS', 'Exception occurred while fetching comments', error);
      return [];
    }
  },

  // Add a new comment
  async addComment(postId: string, content: string, parentId?: string, postType: 'feed' | 'reel' = 'feed'): Promise<Comment | null> {
    try {
      const startTime = Date.now();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      debug.dbQuery('comments', 'INSERT', { postId, content, parentId, userId: user.id });

      let data, error;
      
      // Use specific reel comment function for reels
      if (postType === 'reel') {
        const result = await supabase.rpc('add_reel_comment', {
          p_reel_id: postId,
          p_content: content.trim(),
          p_parent_id: parentId || null,
        });
        
        if (result.error) {
          error = result.error;
        } else if (result.data && result.data.length > 0) {
          // Transform the RPC result to match expected format
          const rpcData = result.data[0];
          data = {
            id: rpcData.id,
            post_id: rpcData.post_id,
            user_id: rpcData.user_id,
            content: rpcData.content,
            parent_id: rpcData.parent_id,
            likes_count: rpcData.likes_count || 0,
            created_at: rpcData.created_at,
            updated_at: rpcData.updated_at,
            user: {
              id: rpcData.user_id,
              username: rpcData.username,
              avatar: rpcData.avatar
            }
          };
        }
      } else {
        // Use regular insert for posts
        const result = await supabase
          .from('comments')
          .insert({
            post_id: postId,
            user_id: user.id,
            content,
            parent_id: parentId,
            post_type: 'feed'
          })
          .select(`
            *,
            user:user_profiles(id, username, avatar)
          `)
          .single();
          
        data = result.data;
        error = result.error;
      }

      if (error) {
        debug.dbError('comments', 'INSERT', error);
        return null;
      }
      
      // Transform to match Comment interface
      const comment: Comment = {
        id: data.id,
        postId: data.post_id,
        userId: data.user_id,
        user: {
          id: data.user_id,
          username: data.user.username,
          avatar: data.user.avatar
        },
        content: data.content,
        parentId: data.parent_id,
        likesCount: data.likes_count,
        isLiked: false,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      debug.dbSuccess('comments', 'INSERT', { postId, commentId: data.id }, Date.now() - startTime);
      return comment;
    } catch (error) {
      debugLogger.error('DATABASE', 'ADD_COMMENT', 'Exception occurred while adding comment', error);
      return null;
    }
  },

  // Toggle comment like
  async toggleCommentLike(commentId: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      debug.dbQuery('comment_likes', 'TOGGLE', { commentId, userId: user.id });

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) {
          debug.dbError('comment_likes', 'DELETE', error);
          return false;
        }
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          });

        if (error) {
          debug.dbError('comment_likes', 'INSERT', error);
          return false;
        }
      }

      debug.dbSuccess('comment_likes', 'TOGGLE', { commentId, userId: user.id }, Date.now() - startTime);
      return true;
    } catch (error) {
      debugLogger.error('DATABASE', 'TOGGLE_COMMENT_LIKE', 'Exception occurred while toggling comment like', error);
      return false;
    }
  },

  // Delete a comment
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      debug.dbQuery('comments', 'DELETE', { commentId, userId: user.id });

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) {
        debug.dbError('comments', 'DELETE', error);
        return false;
      }

      debug.dbSuccess('comments', 'DELETE', { commentId }, Date.now() - startTime);
      return true;
    } catch (error) {
      debugLogger.error('DATABASE', 'DELETE_COMMENT', 'Exception occurred while deleting comment', error);
      return false;
    }
  },

  // Edit a comment
  async editComment(commentId: string, content: string): Promise<Comment | null> {
    try {
      const startTime = Date.now();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      debug.dbQuery('comments', 'UPDATE', { commentId, content, userId: user.id });

      const { data, error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', commentId)
        .eq('user_id', user.id)
        .select(`
          *,
          user:user_profiles(id, username, avatar)
        `)
        .single();

      if (error) {
        debug.dbError('comments', 'UPDATE', error);
        return null;
      }
      
      // Transform to match Comment interface
      const comment: Comment = {
        id: data.id,
        postId: data.post_id,
        userId: data.user_id,
        user: {
          id: data.user_id,
          username: data.user.username,
          avatar: data.user.avatar
        },
        content: data.content,
        parentId: data.parent_id,
        likesCount: data.likes_count,
        isLiked: false, // Will be updated when fetched
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      debug.dbSuccess('comments', 'UPDATE', { commentId }, Date.now() - startTime);
      return comment;
    } catch (error) {
      debugLogger.error('DATABASE', 'EDIT_COMMENT', 'Exception occurred while editing comment', error);
      return null;
    }
  },

  // Get comment count for a post
  async getCommentCount(postId: string): Promise<number> {
    try {
      const startTime = Date.now();
      debug.dbQuery('comments', 'COUNT', { postId });
      
      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) {
        debug.dbError('comments', 'COUNT', error);
        return 0;
      }

      debug.dbSuccess('comments', 'COUNT', { postId, count }, Date.now() - startTime);
      return count || 0;
    } catch (error) {
      debugLogger.error('DATABASE', 'GET_COMMENT_COUNT', 'Exception occurred while getting comment count', error);
      return 0;
    }
  }
};

// =====================================================
// MESSAGE OPERATIONS
// =====================================================

export const messageService = {
  // Get conversations for a user
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const startTime = Date.now();
      debug.dbQuery('conversations', 'SELECT', { userId });
      debugLogger.info('MESSAGE', 'GET_CONVERSATIONS_START', `Fetching conversations for user: ${userId}`);

      // First, get conversations where user is a participant
      const { data: userConversations, error: userConvError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (userConvError || !userConversations || userConversations.length === 0) {
        debug.dbError('conversation_participants', 'SELECT', userConvError);
        debugLogger.info('MESSAGE', 'GET_CONVERSATIONS_EMPTY', 'No conversations found for user');
        return [];
      }

      const conversationIds = userConversations.map(cp => cp.conversation_id);

      // Then get full conversation data with ALL participants
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, conversation_type, created_by, created_at, updated_at,
          conversation_participants(
            user_id,
            user_profiles!conversation_participants_user_id_fkey(
              id, username, handle, full_name, avatar, profile_picture, is_online, last_seen
            )
          ),
          messages(
            id, content, created_at, sender_id, is_read, message_type,
            user_profiles!messages_sender_id_fkey(username, avatar)
          )
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (error) {
        debug.dbError('conversations', 'SELECT', error);
        debugLogger.error('MESSAGE', 'GET_CONVERSATIONS_ERROR', 'Failed to fetch conversations', error);
        return [];
      }

      if (!data || data.length === 0) {
        debugLogger.info('MESSAGE', 'GET_CONVERSATIONS_EMPTY', 'No conversations found');
        return [];
      }

      const conversations: Conversation[] = data.map((conv: any) => {
        // Get the other participant (not the current user)
        const otherParticipants = conv.conversation_participants
          .filter((p: any) => p.user_id !== userId)
          .map((p: any) => ({
            id: p.user_profiles.id,
            username: p.user_profiles.username || p.user_profiles.handle || '',
            avatar: p.user_profiles.avatar || p.user_profiles.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
            fullName: p.user_profiles.full_name || '',
            isOnline: p.user_profiles.is_online || false,
            lastSeen: p.user_profiles.last_seen || '',
          }));

        // Get the latest message
        const latestMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages.reduce((latest: any, msg: any) => 
              new Date(msg.created_at) > new Date(latest.created_at) ? msg : latest
            )
          : null;

        // Count unread messages
        const unreadCount = conv.messages 
          ? conv.messages.filter((msg: any) => 
              msg.sender_id !== userId && !msg.is_read
            ).length 
          : 0;

        return {
          id: conv.id,
          participants: otherParticipants,
          lastMessage: latestMessage ? {
            id: latestMessage.id,
            senderId: latestMessage.sender_id,
            receiverId: userId,
            content: latestMessage.content,
            type: latestMessage.type || 'text',
            timestamp: latestMessage.created_at,
            conversationId: conv.id,
            isRead: latestMessage.is_read,
            createdAt: latestMessage.created_at,
          } : {
            id: '',
            senderId: '',
            receiverId: userId,
            content: 'No messages yet',
            type: 'text' as const,
            timestamp: conv.created_at,
            conversationId: conv.id,
            isRead: true,
            createdAt: conv.created_at,
          },
          unreadCount,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
        };
      });

      debug.dbSuccess('conversations', 'SELECT', { userId, count: conversations.length }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'GET_CONVERSATIONS_SUCCESS', `Fetched ${conversations.length} conversations`, { userId });
      
      return conversations;
    } catch (error) {
      debugLogger.error('MESSAGE', 'GET_CONVERSATIONS_EXCEPTION', 'Exception occurred while fetching conversations', error);
      return [];
    }
  },

  // Get messages for a conversation
  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    try {
      const startTime = Date.now();
      debug.dbQuery('messages', 'SELECT', { conversationId });
      debugLogger.info('MESSAGE', 'GET_MESSAGES_START', `Fetching messages for conversation: ${conversationId}`);

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles!messages_sender_id_fkey(
            id, username, handle, avatar, profile_picture
          ),
          reels!messages_shared_reel_id_fkey(
            id, video_url, thumbnail_url, caption, likes_count, comments_count, shares_count,
            user_profiles!reels_user_id_fkey(id, username, avatar)
          ),
          posts!messages_shared_post_id_fkey(
            id, image_url, content, likes_count, comments_count,
            user_profiles!posts_user_id_fkey(id, username, avatar)
          ),
          stories!messages_shared_story_id_fkey(
            id, image_url, video_url, media_type, expires_at, created_at,
            user_profiles!stories_user_id_fkey(id, username, avatar)
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) {
        debug.dbError('messages', 'SELECT', error);
        debugLogger.error('MESSAGE', 'GET_MESSAGES_ERROR', 'Failed to fetch messages', error);
        return [];
      }

      if (!data) {
        debugLogger.info('MESSAGE', 'GET_MESSAGES_EMPTY', 'No messages found');
        return [];
      }

      console.error('🚨🚨🚨 ABOUT TO MAP MESSAGES - data.length:', data.length);
      console.error('🚨🚨🚨 SAMPLE MESSAGE DATA:', data.length > 0 ? JSON.stringify(data[0], null, 2) : 'NO DATA');

      const messages: Message[] = data.map((msg: any, index: number) => {
        // Add debugging for shared content - VERY VISIBLE LOGS
        console.error('🔍🔍🔍 MESSAGE_MAPPING #' + index + ' - Message:', {
          id: msg.id,
          type: msg.message_type,
          content: msg.content,
          shared_reel_id: msg.shared_reel_id,
          reels: msg.reels,
          shared_post_id: msg.shared_post_id,
          posts: msg.posts,
          shared_story_id: msg.shared_story_id,
          stories: msg.stories
        });

        return {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: userId,
          content: msg.content,
          type: msg.message_type || msg.type || 'text',
          mediaUrl: msg.media_url,
          timestamp: msg.created_at,
          conversationId: msg.conversation_id,
          isRead: msg.is_read,
          createdAt: msg.created_at,
          // Map shared reel data
          sharedReel: (() => {
            console.error('🔍🔍🔍 REEL_MAPPING - msg.reels exists?', !!msg.reels, 'raw reels:', msg.reels);
            return msg.reels ? {
            id: msg.reels.id,
            videoUrl: msg.reels.video_url,
            thumbnailUrl: msg.reels.thumbnail_url,
            caption: msg.reels.caption || '',
            hashtags: [],
            likes: msg.reels.likes_count || 0,
            comments: msg.reels.comments_count || 0,
            shares: msg.reels.shares_count || 0,
            isLiked: false,
            isSaved: false,
            duration: 0,
            timestamp: msg.reels.created_at || new Date().toISOString(),
            user: msg.reels.user_profiles ? {
              id: msg.reels.user_profiles.id,
              username: msg.reels.user_profiles.username,
              avatar: msg.reels.user_profiles.avatar,
              email: '',
              handle: msg.reels.user_profiles.username,
              fullName: msg.reels.user_profiles.username,
              bio: '',
              location: '',
              website: '',
              followers: 0,
              following: 0,
              posts: 0,
              isFollowing: false,
              isPrivate: false,
              isVerified: false,
              createdAt: new Date().toISOString()
            } : {
              id: '',
              username: 'Unknown',
              avatar: '',
              email: '',
              handle: 'unknown',
              fullName: 'Unknown User',
              bio: '',
              location: '',
              website: '',
              followers: 0,
              following: 0,
              posts: 0,
              isFollowing: false,
              isPrivate: false,
              isVerified: false,
              createdAt: new Date().toISOString()
            }
          } : undefined;
          })(),
          // Map shared post data
          sharedPost: msg.posts ? {
            id: msg.posts.id,
            content: msg.posts.content || '',
            image: msg.posts.image_url,
            likes: msg.posts.likes_count || 0,
            comments: msg.posts.comments_count || 0,
            isLiked: false,
            isTrending: false,
            timestamp: msg.posts.created_at || new Date().toISOString(),
            user: msg.posts.user_profiles ? {
              id: msg.posts.user_profiles.id,
              username: msg.posts.user_profiles.username,
              avatar: msg.posts.user_profiles.avatar,
              email: '',
              handle: msg.posts.user_profiles.username,
              fullName: msg.posts.user_profiles.username,
              bio: '',
              location: '',
              website: '',
              followers: 0,
              following: 0,
              posts: 0,
              isFollowing: false,
              isPrivate: false,
              isVerified: false,
              createdAt: new Date().toISOString()
            } : {
              id: '',
              username: 'Unknown',
              avatar: '',
              email: '',
              handle: 'unknown',
              fullName: 'Unknown User',
              bio: '',
              location: '',
              website: '',
              followers: 0,
              following: 0,
              posts: 0,
              isFollowing: false,
              isPrivate: false,
              isVerified: false,
              createdAt: new Date().toISOString()
            }
          } : undefined,
          // Map shared story data
          sharedStory: (() => {
            console.error('🔍🔍🔍 STORY_MAPPING - msg.stories exists?', !!msg.stories, 'raw stories:', msg.stories);
            return msg.stories ? {
              id: msg.stories.id,
              image: msg.stories.image_url,
              imageUrl: msg.stories.image_url,
              videoUrl: msg.stories.video_url,
              video: msg.stories.video_url,
              mediaType: msg.stories.media_type || 'image',
              expiresAt: msg.stories.expires_at,
              expires_at: msg.stories.expires_at,
              createdAt: msg.stories.created_at,
              user: msg.stories.user_profiles ? {
                id: msg.stories.user_profiles.id,
                username: msg.stories.user_profiles.username,
                avatar: msg.stories.user_profiles.avatar,
                email: '',
                handle: msg.stories.user_profiles.username,
                fullName: msg.stories.user_profiles.username,
                bio: '',
                location: '',
                website: '',
                followers: 0,
                following: 0,
                posts: 0,
                isFollowing: false,
                isPrivate: false,
                isVerified: false,
                createdAt: new Date().toISOString()
              } : {
                id: '',
                username: 'Unknown',
                avatar: '',
                email: '',
                handle: 'unknown',
                fullName: 'Unknown User',
                bio: '',
                location: '',
                website: '',
                followers: 0,
                following: 0,
                posts: 0,
                isFollowing: false,
                isPrivate: false,
                isVerified: false,
                createdAt: new Date().toISOString()
              }
            } : undefined;
          })(),
        };
      });

      debug.dbSuccess('messages', 'SELECT', { conversationId, count: messages.length }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'GET_MESSAGES_SUCCESS', `Fetched ${messages.length} messages`, { conversationId });
      
      return messages;
    } catch (error) {
      debugLogger.error('MESSAGE', 'GET_MESSAGES_EXCEPTION', 'Exception occurred while fetching messages', error);
      return [];
    }
  },

  // Send a new message
  async sendMessage(conversationId: string, senderId: string, content: string, messageType: string = 'text', sharedPost?: Post, sharedReel?: Reel, sharedStory?: any, mediaUrl?: string): Promise<Message | null> {
    try {
      const startTime = Date.now();
      debug.userAction('Send message', { conversationId, senderId, messageType });
      debugLogger.info('MESSAGE', 'SEND_MESSAGE_START', `Sending message`, { conversationId, senderId, contentLength: content.length });

      // First, try with message_type column
      let data, error;
      
      try {
        const insertData: any = {
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType,
        };

        // Add media URL if provided
        if (mediaUrl) {
          insertData.media_url = mediaUrl;
        }

        // Add shared content if provided
        if (sharedPost) {
          console.error('🚨🚨🚨 SEND_MESSAGE - Setting shared_post_id:', sharedPost.id, 'full post:', sharedPost);
          insertData.shared_post_id = sharedPost.id;
        }
        if (sharedReel) {
          console.error('🚨🚨🚨 SEND_MESSAGE - Setting shared_reel_id:', sharedReel.id, 'full reel:', sharedReel);
          insertData.shared_reel_id = sharedReel.id;
        }
        if (sharedStory) {
          console.log('📖 SEND_MESSAGE - Setting shared_story_id:', sharedStory.id);
          insertData.shared_story_id = sharedStory.id;
        }

        console.log('📤 SEND_MESSAGE - About to insert message with type:', insertData.message_type);
        
        const result = await supabase
          .from('messages')
          .insert(insertData)
          .select(`
            *,
            user_profiles!messages_sender_id_fkey(
              id, username, handle, avatar, profile_picture
            ),
            reels!messages_shared_reel_id_fkey(
              id, video_url, thumbnail_url, caption, likes_count, comments_count, shares_count,
              user_profiles!reels_user_id_fkey(id, username, avatar)
            ),
            posts!messages_shared_post_id_fkey(
              id, image_url, content, likes_count, comments_count,
              user_profiles!posts_user_id_fkey(id, username, avatar)
            ),
            stories!messages_shared_story_id_fkey(
              id, image_url, video_url, media_type, expires_at, created_at,
              user_profiles!stories_user_id_fkey(id, username, avatar)
            )
          `)
          .single();
          
        console.log('✅ SEND_MESSAGE - Insert result:', result.error ? 'Failed' : 'Success');
        
        data = result.data;
        error = result.error;
      } catch (insertError: any) {
        // If message_type column doesn't exist, try without it
        if (insertError?.message?.includes('message_type') || (error && error.message?.includes('message_type'))) {
          debugLogger.warn('MESSAGE', 'FALLBACK_INSERT', 'Trying insert without message_type column');
          
          const fallbackInsertData: any = {
            conversation_id: conversationId,
            sender_id: senderId,
            content,
          };

          // Add shared content if provided (fallback case)
          if (sharedPost) {
            fallbackInsertData.shared_post_id = sharedPost.id;
          }
          if (sharedReel) {
            fallbackInsertData.shared_reel_id = sharedReel.id;
          }
          if (sharedStory) {
            fallbackInsertData.shared_story_id = sharedStory.id;
          }

          const fallbackResult = await supabase
            .from('messages')
            .insert(fallbackInsertData)
            .select(`
              *,
              user_profiles!messages_sender_id_fkey(
                id, username, handle, avatar, profile_picture
              )
            `)
            .single();
            
          data = fallbackResult.data;
          error = fallbackResult.error;
        } else {
          throw insertError;
        }
      }

      if (error) {
        debug.dbError('messages', 'INSERT', error);
        debugLogger.error('MESSAGE', 'SEND_MESSAGE_ERROR', 'Failed to send message', error);
        return null;
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      const message: Message = {
        id: data.id,
        senderId: data.sender_id,
        receiverId: '', // Will be filled by the recipient
        content: data.content,
        timestamp: data.created_at,
        conversationId: data.conversation_id,
        isRead: data.is_read,
        createdAt: data.created_at,
        type: messageType as any,
        sharedPost: sharedPost,
        sharedReel: sharedReel,
        sharedStory: sharedStory,
      };

      debug.dbSuccess('messages', 'INSERT', { conversationId, messageId: data.id }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'SEND_MESSAGE_SUCCESS', `Message sent successfully`, { messageId: data.id });
      
      return message;
    } catch (error) {
      debugLogger.error('MESSAGE', 'SEND_MESSAGE_EXCEPTION', 'Exception occurred while sending message', error);
      return null;
    }
  },

  // Find existing conversation with a specific user
  async findConversationWithUser(currentUserId: string, otherUserId: string): Promise<string | null> {
    try {
      debugLogger.info('MESSAGE', 'FIND_CONVERSATION_START', `Looking for conversation between users`, { currentUserId, otherUserId });

      // Use the existing RPC function to find direct conversations
      const { data: existingConv, error: checkError } = await supabase
        .rpc('find_direct_conversation', {
          user1_id: currentUserId,
          user2_id: otherUserId
        });

      if (checkError) {
        debugLogger.warn('MESSAGE', 'FIND_CONVERSATION_ERROR', 'Error checking existing conversation', checkError);
        return null;
      }

      if (existingConv && existingConv.length > 0) {
        debugLogger.success('MESSAGE', 'FIND_CONVERSATION_SUCCESS', 'Found existing conversation', { conversationId: existingConv[0].id });
        return existingConv[0].id;
      }

      debugLogger.info('MESSAGE', 'FIND_CONVERSATION_NONE', 'No existing conversation found');
      return null;
    } catch (error) {
      debugLogger.error('MESSAGE', 'FIND_CONVERSATION_EXCEPTION', 'Exception occurred while finding conversation', error);
      return null;
    }
  },

  // Create a new conversation
  async createConversation(participants: string[] | any): Promise<string | null> {
    try {
      const startTime = Date.now();
      debug.userAction('Create conversation', { participants });
      
      // Handle different input formats
      let participantArray: string[] = [];
      
      if (Array.isArray(participants)) {
        // Direct array input
        participantArray = participants;
      } else if (participants && typeof participants === 'object') {
        // Handle object format like { participants: [...], createdBy: "..." }
        if (participants.participants && Array.isArray(participants.participants)) {
          participantArray = participants.participants;
        } else if (participants.createdBy) {
          // If only createdBy is provided, use it as the only participant
          participantArray = [participants.createdBy];
        } else {
          // Try to extract any array-like properties
          const keys = Object.keys(participants);
          for (const key of keys) {
            if (Array.isArray(participants[key])) {
              participantArray = participants[key];
              break;
            }
          }
        }
      } else if (typeof participants === 'string') {
        // Single string input
        participantArray = [participants];
      }
      
      debugLogger.info('MESSAGE', 'CREATE_CONVERSATION_START', `Creating conversation`, { 
        participantCount: participantArray.length,
        participants: participantArray,
        originalInput: participants
      });

      // Validate input
      if (!participantArray || participantArray.length === 0) {
        debugLogger.error('MESSAGE', 'CREATE_CONVERSATION_ERROR', 'No valid participants found', { 
          originalInput: participants,
          processedArray: participantArray 
        });
        return null;
      }

      // Remove duplicates and validate UUIDs
      const uniqueParticipants = [...new Set(participantArray)].filter(p => {
        const isValid = p && typeof p === 'string' && p.length > 0;
        if (!isValid) {
          debugLogger.warn('MESSAGE', 'INVALID_PARTICIPANT', `Invalid participant: ${p}`);
        }
        return isValid;
      });

      if (uniqueParticipants.length === 0) {
        debugLogger.error('MESSAGE', 'CREATE_CONVERSATION_ERROR', 'No valid participants after filtering');
        return null;
      }

      debugLogger.info('MESSAGE', 'PARTICIPANTS_VALIDATED', `Valid participants: ${uniqueParticipants.length}`);

      // Check if conversation already exists between these participants (for direct messages only)
      if (uniqueParticipants.length === 2) {
        try {
          const { data: existingConv, error: checkError } = await supabase
            .rpc('find_direct_conversation', {
              user1_id: uniqueParticipants[0],
              user2_id: uniqueParticipants[1]
            });

          if (checkError) {
            debugLogger.warn('MESSAGE', 'CHECK_EXISTING_ERROR', 'Error checking existing conversation', checkError);
            // Continue with creation even if check fails
          } else if (existingConv && existingConv.length > 0) {
            debugLogger.info('MESSAGE', 'CONVERSATION_EXISTS', 'Conversation already exists', { conversationId: existingConv[0].id });
            return existingConv[0].id;
          }
        } catch (rpcError) {
          debugLogger.warn('MESSAGE', 'RPC_CHECK_FAILED', 'RPC check failed, continuing with creation', rpcError);
          // Continue with creation
        }
      }

      // Prepare conversation data
      const conversationData: any = {
        conversation_type: uniqueParticipants.length === 2 ? 'direct' : 'group',
      };

      // Note: title column was removed from database, so we don't add it
      // Group chats will be identified by conversation_type = 'group'

      // Add created_by if we have a current user (first participant is usually the creator)
      if (uniqueParticipants.length > 0) {
        conversationData.created_by = uniqueParticipants[0];
      }

      debugLogger.info('MESSAGE', 'CREATING_CONVERSATION', 'About to create conversation', conversationData);

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (convError) {
        debug.dbError('conversations', 'INSERT', convError);
        debugLogger.error('MESSAGE', 'CREATE_CONVERSATION_ERROR', 'Failed to create conversation', {
          error: convError,
          data: conversationData,
          message: convError.message,
          details: convError.details,
          hint: convError.hint
        });
        return null;
      }

      if (!conversation || !conversation.id) {
        debugLogger.error('MESSAGE', 'CREATE_CONVERSATION_ERROR', 'Conversation created but no ID returned');
        return null;
      }

      debugLogger.info('MESSAGE', 'CONVERSATION_CREATED', 'Conversation created successfully', { 
        conversationId: conversation.id 
      });

      // Add participants
      const participantData = uniqueParticipants.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
      }));

      debugLogger.info('MESSAGE', 'ADDING_PARTICIPANTS', 'About to add participants', { 
        count: participantData.length,
        conversationId: conversation.id
      });

      console.log('🔧 Adding participants to conversation:', conversation.id);
      console.log('👥 Participants to add:', uniqueParticipants);
      console.log('📝 Participant data:', participantData);
      
      const { data: insertedParticipants, error: participantError } = await supabase
        .from('conversation_participants')
        .insert(participantData)
        .select('*');

      if (participantError) {
        debug.dbError('conversation_participants', 'INSERT', participantError);
        debugLogger.error('MESSAGE', 'ADD_PARTICIPANTS_ERROR', 'Failed to add participants', {
          error: participantError,
          data: participantData,
          message: participantError.message,
          details: participantError.details,
          hint: participantError.hint
        });
        
        // Try to clean up the conversation if participants failed
        try {
          await supabase.from('conversations').delete().eq('id', conversation.id);
          debugLogger.info('MESSAGE', 'CLEANUP_SUCCESS', 'Cleaned up conversation after participant error');
        } catch (cleanupError) {
          debugLogger.error('MESSAGE', 'CLEANUP_FAILED', 'Failed to cleanup conversation', cleanupError);
        }
        
        return null;
      }

      console.log('✅ Participants added successfully:', insertedParticipants);
      
      debug.dbSuccess('conversations', 'CREATE', { conversationId: conversation.id }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'CREATE_CONVERSATION_SUCCESS', `Conversation created successfully`, { 
        conversationId: conversation.id,
        participantCount: uniqueParticipants.length,
        type: conversationData.conversation_type
      });
      
      return conversation.id;
    } catch (error: any) {
      debugLogger.error('MESSAGE', 'CREATE_CONVERSATION_EXCEPTION', 'Exception occurred while creating conversation', {
        error: error,
        message: error?.message,
        stack: error?.stack,
        originalInput: participants,
        errorType: error?.constructor?.name
      });
      return null;
    }
  },

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      debug.userAction('Mark messages as read', { conversationId, userId });
      debugLogger.info('MESSAGE', 'MARK_READ_START', `Marking messages as read`, { conversationId, userId });

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) {
        debug.dbError('messages', 'UPDATE', error);
        debugLogger.error('MESSAGE', 'MARK_READ_ERROR', 'Failed to mark messages as read', error);
        return false;
      }

      debug.dbSuccess('messages', 'UPDATE', { conversationId }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'MARK_READ_SUCCESS', `Messages marked as read`, { conversationId });
      
      return true;
    } catch (error) {
      debugLogger.error('MESSAGE', 'MARK_READ_EXCEPTION', 'Exception occurred while marking messages as read', error);
      return false;
    }
  },



  // Get conversation participants
  async getConversationParticipants(conversationId: string): Promise<User[]> {
    try {
      const startTime = Date.now();
      debug.dbQuery('conversation_participants', 'SELECT', { conversationId });
      debugLogger.info('MESSAGE', 'GET_PARTICIPANTS_START', `Fetching participants`, { conversationId });

      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          user_profiles!conversation_participants_user_id_fkey(
            id, username, handle, full_name, avatar, profile_picture, 
            bio, location, age, is_host, is_online, last_seen
          )
        `)
        .eq('conversation_id', conversationId);

      if (error) {
        debug.dbError('conversation_participants', 'SELECT', error);
        debugLogger.error('MESSAGE', 'GET_PARTICIPANTS_ERROR', 'Failed to fetch participants', error);
        return [];
      }

      if (!data) return [];

      const participants: User[] = data.map((p: any) => ({
        id: p.user_profiles.id,
        username: p.user_profiles.username || p.user_profiles.handle || '',
        avatar: p.user_profiles.avatar || p.user_profiles.profile_picture || '',
        fullName: p.user_profiles.full_name || '',
        bio: p.user_profiles.bio || '',
        location: p.user_profiles.location || '',
        age: p.user_profiles.age || 0,
        isHost: p.user_profiles.is_host || false,
        isOnline: p.user_profiles.is_online || false,
        lastSeen: p.user_profiles.last_seen || '',
      }));

      debug.dbSuccess('conversation_participants', 'SELECT', { conversationId, count: participants.length }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'GET_PARTICIPANTS_SUCCESS', `Fetched ${participants.length} participants`, { conversationId });
      
      return participants;
    } catch (error) {
      debugLogger.error('MESSAGE', 'GET_PARTICIPANTS_EXCEPTION', 'Exception occurred while fetching participants', error);
      return [];
    }
  },

  // Search conversations
  async searchConversations(userId: string, query: string): Promise<Conversation[]> {
    try {
      const startTime = Date.now();
      debug.searchStart('conversations', { userId, query });
      debugLogger.info('MESSAGE', 'SEARCH_CONVERSATIONS_START', `Searching conversations`, { userId, query });

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(
            user_id,
            user_profiles!conversation_participants_user_id_fkey(
              id, username, handle, full_name, avatar, profile_picture
            )
          ),
          messages(id, content, created_at, sender_id, is_read)
        `)
        .eq('conversation_participants.user_id', userId)
        .ilike('conversation_participants.user_profiles.username', `%${query}%`)
        .order('updated_at', { ascending: false });

      if (error) {
        debug.searchError('conversations', error);
        debugLogger.error('MESSAGE', 'SEARCH_CONVERSATIONS_ERROR', 'Failed to search conversations', error);
        return [];
      }

      // Format the data similar to getConversations
      const conversations = data?.map((conv: any) => {
        const otherParticipants = conv.conversation_participants
          .filter((p: any) => p.user_id !== userId)
          .map((p: any) => ({
            id: p.user_profiles.id,
            username: p.user_profiles.username || p.user_profiles.handle || '',
            avatar: p.user_profiles.avatar || p.user_profiles.profile_picture || '',
            fullName: p.user_profiles.full_name || '',
          }));

        const latestMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages.reduce((latest: any, msg: any) => 
              new Date(msg.created_at) > new Date(latest.created_at) ? msg : latest
            )
          : null;

        return {
          id: conv.id,
          participants: otherParticipants,
          lastMessage: latestMessage ? {
            id: latestMessage.id,
            senderId: latestMessage.sender_id,
            receiverId: userId,
            content: latestMessage.content,
            type: latestMessage.type || 'text',
            timestamp: latestMessage.created_at,
            conversationId: conv.id,
            isRead: latestMessage.is_read,
            createdAt: latestMessage.created_at,
          } : {
            id: '',
            senderId: '',
            receiverId: userId,
            content: 'No messages yet',
            type: 'text' as const,
            timestamp: conv.created_at,
            conversationId: conv.id,
            isRead: true,
            createdAt: conv.created_at,
          },
          unreadCount: conv.messages 
            ? conv.messages.filter((msg: any) => 
                msg.sender_id !== userId && !msg.is_read
              ).length 
            : 0,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
        };
      }) || [];

      debug.dbSuccess('conversations', 'SEARCH', { query, count: conversations.length }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'SEARCH_CONVERSATIONS_SUCCESS', `Found ${conversations.length} conversations`, { query });
      
      return conversations;
    } catch (error) {
      debugLogger.error('MESSAGE', 'SEARCH_CONVERSATIONS_EXCEPTION', 'Exception occurred while searching conversations', error);
      return [];
    }
  },

  // Edit a message
  async editMessage(messageId: string, newContent: string, userId: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      debug.userAction('Edit message', { messageId, userId });
      debugLogger.info('MESSAGE', 'EDIT_MESSAGE_START', `Editing message`, { messageId, contentLength: newContent.length });

      const { error } = await supabase
        .from('messages')
        .update({ 
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId); // Only allow editing own messages

      if (error) {
        debug.dbError('messages', 'UPDATE', error);
        debugLogger.error('MESSAGE', 'EDIT_MESSAGE_ERROR', 'Failed to edit message', error);
        return false;
      }

      debug.dbSuccess('messages', 'UPDATE', { messageId }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'EDIT_MESSAGE_SUCCESS', `Message edited successfully`, { messageId });
      return true;
    } catch (error) {
      debugLogger.error('MESSAGE', 'EDIT_MESSAGE_EXCEPTION', 'Exception occurred while editing message', error);
      return false;
    }
  },

  // Delete a message
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      debug.userAction('Delete message', { messageId, userId });
      debugLogger.info('MESSAGE', 'DELETE_MESSAGE_START', `Deleting message`, { messageId, userId });

      // First, check if the message exists and belongs to the user
      const { data: existingMessage, error: fetchError } = await supabase
        .from('messages')
        .select('id, sender_id, content, is_deleted')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('🚨 DELETE_MESSAGE - Fetch error:', fetchError);
        debugLogger.error('MESSAGE', 'DELETE_MESSAGE_FETCH_ERROR', 'Failed to fetch message for deletion', fetchError);
        return false;
      }

      if (!existingMessage) {
        console.error('🚨 DELETE_MESSAGE - Message not found:', messageId);
        debugLogger.error('MESSAGE', 'DELETE_MESSAGE_NOT_FOUND', 'Message not found', { messageId });
        return false;
      }

      if (existingMessage.sender_id !== userId) {
        console.error('🚨 DELETE_MESSAGE - Unauthorized:', { messageId, userId, actualSender: existingMessage.sender_id });
        debugLogger.error('MESSAGE', 'DELETE_MESSAGE_UNAUTHORIZED', 'User not authorized to delete this message', { messageId, userId });
        return false;
      }

      if (existingMessage.is_deleted) {
        console.error('🚨 DELETE_MESSAGE - Already deleted:', messageId);
        debugLogger.error('MESSAGE', 'DELETE_MESSAGE_ALREADY_DELETED', 'Message already deleted', { messageId });
        return false;
      }

      console.log('🔥 DELETE_MESSAGE - About to delete:', { messageId, userId, currentContent: existingMessage.content });

      // Now perform the delete (soft delete)
      const { data: updateData, error: updateError } = await supabase
        .from('messages')
        .update({ 
          content: 'This message was deleted',
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId)
        .select();

      if (updateError) {
        console.error('🚨 DELETE_MESSAGE - Update error:', updateError);
        debug.dbError('messages', 'UPDATE', updateError);
        debugLogger.error('MESSAGE', 'DELETE_MESSAGE_ERROR', 'Failed to delete message', updateError);
        return false;
      }

      console.log('✅ DELETE_MESSAGE - Update result:', updateData);

      if (!updateData || updateData.length === 0) {
        console.error('🚨 DELETE_MESSAGE - No rows updated');
        debugLogger.error('MESSAGE', 'DELETE_MESSAGE_NO_ROWS', 'No rows were updated during deletion', { messageId, userId });
        return false;
      }

      debug.dbSuccess('messages', 'UPDATE', { messageId }, Date.now() - startTime);
      debugLogger.success('MESSAGE', 'DELETE_MESSAGE_SUCCESS', `Message deleted successfully`, { messageId });
      console.log('🎉 DELETE_MESSAGE - Success:', messageId);
      return true;
    } catch (error) {
      console.error('🚨 DELETE_MESSAGE - Exception:', error);
      debugLogger.error('MESSAGE', 'DELETE_MESSAGE_EXCEPTION', 'Exception occurred while deleting message', error);
      return false;
    }
  },

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      debugLogger.info('MESSAGE', 'MARK_AS_READ_START', `Marking messages as read`, { conversationId, userId });

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId) // Mark messages NOT sent by the current user as read
        .eq('is_read', false);

      if (error) {
        debugLogger.error('MESSAGE', 'MARK_AS_READ_ERROR', 'Failed to mark messages as read', error);
        return false;
      }

      debugLogger.success('MESSAGE', 'MARK_AS_READ_SUCCESS', 'Messages marked as read successfully');
      return true;
    } catch (error) {
      debugLogger.error('MESSAGE', 'MARK_AS_READ_EXCEPTION', 'Exception occurred while marking messages as read', error);
      return false;
    }
  },
};

// =====================================================
// BULLETIN BOARD SERVICE
// =====================================================

const bulletinService = {
  // Get bulletin board notes for a user
  async getBulletinNotes(userId: string): Promise<BulletinNote[]> {
    try {
      debug.dbQuery('bulletin', 'SELECT', { userId });
      
      const { data, error } = await supabase
        .from('bulletin_board')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        debug.dbError('bulletin', 'SELECT', { error: error.message });
        return [];
      }

      return data.map(note => ({
        id: note.id,
        userId: note.user_id,
        title: note.title,
        description: note.description,
        imageUrl: note.image_url,
        thumbnailUrl: note.thumbnail_url,
        noteType: note.note_type,
        amount: note.amount,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));
    } catch (error) {
      debug.dbError('bulletin', 'SELECT', { error: (error as Error).message });
      return [];
    }
  },

  // Create a new bulletin board note
  async createBulletinNote(
    userId: string,
    title: string,
    description: string,
    imageUrl: string,
    thumbnailUrl: string,
    noteType: 'sticky' | 'currency',
    amount?: number
  ): Promise<BulletinNote | null> {
    try {
      debug.dbQuery('bulletin', 'INSERT', { userId, title, noteType });
      
      const { data, error } = await supabase
        .from('bulletin_board')
        .insert({
          user_id: userId,
          title,
          description,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          note_type: noteType,
          amount: noteType === 'currency' ? amount : null,
        })
        .select()
        .single();

      if (error) {
        debug.dbError('bulletin', 'INSERT', { error: error.message });
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        imageUrl: data.image_url,
        thumbnailUrl: data.thumbnail_url,
        noteType: data.note_type,
        amount: data.amount,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      debug.dbError('bulletin', 'INSERT', { error: (error as Error).message });
      return null;
    }
  },

  // Update a bulletin board note
  async updateBulletinNote(
    noteId: string,
    updates: Partial<Pick<BulletinNote, 'title' | 'description' | 'imageUrl' | 'thumbnailUrl' | 'amount'>>
  ): Promise<BulletinNote | null> {
    try {
      debug.dbQuery('bulletin', 'UPDATE', { noteId, updates });
      
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
      if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;
      if (updates.amount !== undefined) updateData.amount = updates.amount;

      const { data, error } = await supabase
        .from('bulletin_board')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        debug.dbError('bulletin', 'UPDATE', { error: error.message });
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        imageUrl: data.image_url,
        thumbnailUrl: data.thumbnail_url,
        noteType: data.note_type,
        amount: data.amount,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      debug.dbError('bulletin', 'UPDATE', { error: (error as Error).message });
      return null;
    }
  },

  // Delete a bulletin board note
  async deleteBulletinNote(noteId: string): Promise<boolean> {
    try {
      debug.dbQuery('bulletin', 'DELETE', { noteId });
      
      const { error } = await supabase
        .from('bulletin_board')
        .delete()
        .eq('id', noteId);

      if (error) {
        debug.dbError('bulletin', 'DELETE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      debug.dbError('bulletin', 'DELETE', { error: (error as Error).message });
      return false;
    }
  },

  // Get bulletin board note count by type
  async getBulletinNoteCountByType(userId: string, noteType: 'sticky' | 'currency'): Promise<number> {
    try {
      debug.dbQuery('bulletin', 'COUNT', { userId, noteType });
      
      const { count, error } = await supabase
        .from('bulletin_board')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('note_type', noteType);

      if (error) {
        debug.dbError('bulletin', 'COUNT', { error: error.message });
        return 0;
      }

      return count || 0;
    } catch (error) {
      debug.dbError('bulletin', 'COUNT', { error: (error as Error).message });
      return 0;
    }
  },
};

// =====================================================
// EXPORT ALL SERVICES
// =====================================================

export const dataService = {
  user: userService,
  post: postService,
  story: storyService,
  reel: reelService,
  hashtag: hashtagService,
  host: hostService,
  review: reviewService,
  storage: storageService,
  comment: commentService,
  message: messageService,
  bulletin: bulletinService,
}; 