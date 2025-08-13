import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/app/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';
import { router } from 'expo-router';
import { dataService } from '@/services/dataService';

const USER_STORAGE_KEY = '@user_data';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

interface UserContextType extends UserState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  checkAuthAndRedirect: () => void;
  clearAllAuthData: () => Promise<void>;
  createDummyUser: (email: string, password: string, userData: any) => Promise<boolean>;
  registerHost: (hostData: any) => Promise<boolean>;
}

const initialState: UserState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null 
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const isValidUser = (data: any): data is User => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.username === 'string' &&
    typeof data.avatar === 'string'
  );
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Load user data on app start
  useEffect(() => {
    loadUserData();
  }, []);

  // Listen to Supabase auth state changes
  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          console.log('🚪 User signed out or token expired');
          // User signed out or token expired
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          dispatch({ type: 'LOGOUT' });
          
          // Redirect to login page
          if (router.canGoBack()) {
            router.replace('/login');
          } else {
            router.push('/login');
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in:', session.user.id);
          // User signed in
          const userProfile = await fetchUserProfile(session.user.id);
          if (userProfile) {
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
            dispatch({ type: 'SET_USER', payload: userProfile });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Check authentication status and redirect if needed
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      // Redirect to login page if user is not authenticated
      router.replace('/login');
    }
  }, [state.isAuthenticated, state.isLoading]);

  // Fetch user profile from Supabase after login
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    console.log('🔍 Fetching user profile for:', userId);
    try {
      const user = await dataService.user.getUserProfile(userId);
      if (user) {
        console.log('✅ User profile fetched:', user);
        return user;
      } else {
        console.error('❌ Failed to fetch user profile');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  };

  const loadUserData = async () => {
    try {
      console.log('🔍 Loading user data...');
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // First, check if there's a valid Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        dispatch({ type: 'SET_USER', payload: null });
        return;
      }

      console.log('📋 Session check result:', session ? 'Valid session' : 'No session');

      // If no valid session, clear stored data and set user as null
      if (!session?.user) {
        console.log('🚫 No valid session found, clearing stored data');
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        dispatch({ type: 'SET_USER', payload: null });
        return;
      }

      console.log('✅ Valid session found for user:', session.user.id);

      // If there's a valid session, try to load user profile
      const userProfile = await fetchUserProfile(session.user.id);
      
      if (userProfile) {
        console.log('👤 User profile loaded:', userProfile.username);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
        dispatch({ type: 'SET_USER', payload: userProfile });
      } else {
        console.log('❌ Failed to load user profile, clearing stored data');
        // If profile fetch fails, clear stored data
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      console.error('💥 Error loading user data:', error);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data' });
      dispatch({ type: 'SET_USER', payload: null });
    }
  };

  // --- REAL LOGIN ---
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (!email?.trim() || !password?.trim()) {
        dispatch({ type: 'SET_ERROR', payload: 'Email and password are required' });
        return false;
      }

      // Call Supabase to sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data?.user) {
        dispatch({ type: 'SET_ERROR', payload: error?.message ?? 'Login failed' });
        return false;
      }

      // Fetch profile info from Supabase
      const userProfile = await fetchUserProfile(data.user.id);

      if (!userProfile) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load profile' });
        return false;
      }

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
      dispatch({ type: 'SET_USER', payload: userProfile });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed. Please try again.' });
      return false;
    }
  };

  // --- REAL LOGOUT ---
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      dispatch({ type: 'LOGOUT' });
      // Redirect to login page after logout
      router.replace('/login');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Logout failed' });
    }
  };

  // --- UPDATE USER PROFILE (SUPABASE) ---
  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      if (!state.user) return;

      const success = await dataService.user.updateUserProfile(state.user.id, userData);

      if (!success) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to update user data' });
        return;
      }

      // Fetch updated profile
      const updatedProfile = await fetchUserProfile(state.user.id);

      if (updatedProfile) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedProfile));
        dispatch({ type: 'SET_USER', payload: updatedProfile });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update user data' });
    }
  };

  const checkAuthAndRedirect = () => {
    if (!state.isAuthenticated && !state.isLoading) {
      router.replace('/login');
    }
  };

  // Debug function to clear all auth data
  const clearAllAuthData = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
      console.log('All auth data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  // Create dummy user without email verification
  // Helper function to safely format date for database
  const formatDateForDB = (date: any): string | null => {
    if (!date) return null;
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Invalid date format:', date);
      return null;
    }
  };

  const createDummyUser = async (email: string, password: string, userData: any): Promise<boolean> => {
    try {
      console.log('🔧 Creating dummy user:', email);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Sign up user with Supabase (email confirmation disabled for development)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: userData.fullName,
            handle: userData.handle,
            username: userData.username,
          }
        }
      });

      console.log('🔍 Sign up response:', { data, error });

      if (error) {
        console.error('❌ Sign up error:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return false;
      }

      if (!data.user) {
        console.error('❌ No user returned from sign up');
        dispatch({ type: 'SET_ERROR', payload: 'No user returned from sign up' });
        return false;
      }

      console.log('✅ User created successfully:', data.user.id);

      // Check if user profile exists, if not create it
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking profile:', checkError);
      }

      if (!existingProfile) {
        // Create user profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: userData.fullName || 'User',
            handle: userData.handle || `user_${data.user.id}`,
            username: userData.username || `user_${data.user.id}`,
            bio: userData.bio || '',
            location: userData.location || '',
            age: userData.age || 0,
            gender: userData.gender || '',
            date_of_birth: formatDateForDB(userData.dateOfBirth),
            profile_picture: userData.profilePicture || '',
            face_data: userData.faceData || '',
          });

        if (insertError) {
          console.error('❌ Profile creation error:', insertError);
          dispatch({ type: 'SET_ERROR', payload: insertError.message });
          return false;
        }
        console.log('✅ Profile created successfully');
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: userData.fullName,
            handle: userData.handle,
            username: userData.username,
            bio: userData.bio || '',
            location: userData.location || '',
            age: userData.age || 0,
            gender: userData.gender || '',
            date_of_birth: formatDateForDB(userData.dateOfBirth),
            profile_picture: userData.profilePicture || '',
            face_data: userData.faceData || '',
          })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('❌ Profile update error:', updateError);
          dispatch({ type: 'SET_ERROR', payload: updateError.message });
          return false;
        }
        console.log('✅ Profile updated successfully');
      }

      // Fetch the complete user profile
      const userProfile = await fetchUserProfile(data.user.id);
      if (userProfile) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
        dispatch({ type: 'SET_USER', payload: userProfile });
        console.log('✅ User logged in successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('💥 Create dummy user error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create user' });
      return false;
    }
  };

  // Register user as a host
  const registerHost = async (hostData: any): Promise<boolean> => {
    try {
      console.log('🏠 Registering host:', hostData);
      
      if (!state.user) {
        console.error('❌ No user logged in');
        return false;
      }

      // Create host profile using data service
      const success = await dataService.host.createHostProfile({
        userId: state.user.id,
        description: hostData.description,
        relationshipRoles: hostData.relationshipRoles,
        interests: hostData.interests,
        expertise: hostData.expertise,
        priceCategory: hostData.priceCategory,
        isApproved: true, // Auto-approve for development
      });

      if (!success) {
        console.error('❌ Host profile creation failed');
        return false;
      }

      // Update user profile with location data and host status
      const userUpdateData: Partial<User> = {
        isHost: true,
        hourlyRate: hostData.hourlyRate,
      };

      // Add location data if available
      if (hostData.location && hostData.latitude && hostData.longitude) {
        userUpdateData.location = hostData.location;
        userUpdateData.latitude = hostData.latitude;
        userUpdateData.longitude = hostData.longitude;
      }

      if (!success) {
        console.error('❌ Host profile creation failed');
        return false;
      }

      // Update user profile to mark as host
      const userUpdateSuccess = await dataService.user.updateUserProfile(state.user.id, userUpdateData);

      if (!userUpdateSuccess) {
        console.error('❌ User profile update failed');
        return false;
      }

      // Update local state
      const updatedUser = { ...state.user, ...userUpdateData };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      dispatch({ type: 'SET_USER', payload: updatedUser });

      console.log('✅ Host registration successful');
      return true;
    } catch (error) {
      console.error('💥 Host registration error:', error);
      return false;
    }
  };

  const value: UserContextType = {
    ...state,
    login,
    logout,
    updateUser,
    checkAuthAndRedirect,
    clearAllAuthData,
    createDummyUser,
    registerHost,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
