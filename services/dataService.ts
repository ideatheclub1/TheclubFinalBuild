import { supabase } from '@/app/lib/supabase';
import { 
  User, Post, Story, Reel, Message, Conversation, Comment, 
  Like, Hashtag, Notification, Booking, Review, HostProfile 
} from '@/types';
import { calculateDistance } from '@/utils/distanceCalculator';
import { debug, debugLogger } from '@/utils/debugLogger';

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
  // Get all posts with user data
  async getPosts(limit = 20, offset = 0): Promise<Post[]> {
    try {
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
        isLiked: false, // Will be checked separately
        isTrending: post.is_trending || false,
        timestamp: post.created_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching posts:', error);
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
  async getPostsByUser(userId: string, limit = 20, offset = 0): Promise<Post[]> {
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
        isLiked: false, // Will be checked separately
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
        return !error;
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            post_id: postId,
          });
        return !error;
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
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
        image: story.image_url,
        imageUrl: story.image_url,
        expiresAt: story.expires_at,
        createdAt: story.created_at,
      }));
    } catch (error) {
      console.error('Error fetching stories:', error);
      return [];
    }
  },

  // Create a new story
  async createStory(userId: string, imageUrl: string, expiresInHours = 24): Promise<Story | null> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const { data: story, error } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error || !story) return null;

      const user = await userService.getUserProfile(userId);
      if (!user) return null;

      return {
        id: story.id,
        user,
        image: story.image_url,
        imageUrl: story.image_url,
        expiresAt: story.expires_at,
        createdAt: story.created_at,
      };
    } catch (error) {
      console.error('Error creating story:', error);
      return null;
    }
  },
};

// =====================================================
// REEL OPERATIONS
// =====================================================

export const reelService = {
  // Get all reels with user data
  async getReels(limit = 20, offset = 0): Promise<Reel[]> {
    try {
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
        hashtags: [], // Will be fetched separately
        likes: reel.likes_count || 0,
        likesCount: reel.likes_count || 0,
        comments: reel.comments_count || 0,
        commentsCount: reel.comments_count || 0,
        shares: reel.shares_count || 0,
        sharesCount: reel.shares_count || 0,
        isLiked: false, // Will be checked separately
        isSaved: false, // Will be checked separately
        duration: reel.duration || 0,
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
    musicInfo?: { title: string; artist: string; coverUrl: string }
  ): Promise<Reel | null> {
    try {
      const { data: reel, error } = await supabase
        .from('reels')
        .insert({
          user_id: userId,
          video_url: videoUrl,
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
}; 