import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useUser } from './UserContext';
import { usePresence } from '@/hooks/usePresence';
import { debug, useDebugLogger } from '@/utils/debugLogger';

interface PresenceUser {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen: string;
}

interface PresenceContextType {
  onlineUsers: Map<string, PresenceUser>;
  isUserOnline: (userId: string) => boolean;
  getUserPresence: (userId: string) => PresenceUser | null;
  refreshPresence: () => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const usePresenceContext = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
};

export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('PresenceContext');
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());
  const lastLoadLogTimeRef = React.useRef<number>(0);
  
  // Initialize user's own presence
  usePresence();

  // Subscribe to presence changes from other users
  useEffect(() => {
    if (!currentUser?.id) return;

    // debugLogger.info('PRESENCE_CONTEXT', 'SETUP', 'Setting up presence subscriptions');

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel('global-presence')
      .on('broadcast', { event: 'presence_change' }, (payload: any) => {
        try {
          const { userId, username, status, timestamp } = payload.payload;
          
          // Only log status changes, not all presence updates to reduce spam
          if (status === 'offline') {
            // debugLogger.info('PRESENCE_CONTEXT', 'USER_OFFLINE', `${username} went offline`);
          }

          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            if (status === 'online') {
              newMap.set(userId, {
                userId,
                username,
                isOnline: true,
                lastSeen: new Date().toISOString()
              });
            } else {
              const existingUser = newMap.get(userId);
              if (existingUser) {
                newMap.set(userId, {
                  ...existingUser,
                  isOnline: false,
                  lastSeen: new Date().toISOString()
                });
              }
            }
            return newMap;
          });
        } catch (error) {
          // debugLogger.error('PRESENCE_CONTEXT', 'PRESENCE_UPDATE_ERROR', 'Error processing presence update', error);
        }
      })
      .subscribe((status: string) => {
        // Only log channel connection issues, not every status
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          // debugLogger.warn('PRESENCE_CONTEXT', 'CHANNEL_ISSUE', `Global presence channel: ${status}`);
        }
      });

    // Initial load of online users
    loadOnlineUsers();

    // Periodic refresh (every 1 minute for up-to-date presence)
    const refreshInterval = setInterval(loadOnlineUsers, 60000);

    return () => {
      // debugLogger.info('PRESENCE_CONTEXT', 'CLEANUP', 'Cleaning up presence subscriptions');
      presenceChannel.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [currentUser?.id, debugLogger]);

  // Load currently online users from database
  const loadOnlineUsers = async () => {
    if (!currentUser?.id) return;

    try {
      // Only log database loads every 1 minute to reduce spam
      const now = Date.now();
      const shouldLog = now - lastLoadLogTimeRef.current >= 60000; // 1 minute
      
      if (shouldLog) {
        // debugLogger.info('PRESENCE_CONTEXT', 'LOAD_ONLINE', 'Loading online users from database');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, is_online, last_seen')
        .eq('is_online', true)
        .neq('id', currentUser.id); // Exclude current user

      if (error) {
        // debugLogger.error('PRESENCE_CONTEXT', 'LOAD_ERROR', 'Failed to load online users', error);
        return;
      }

      const onlineUsersMap = new Map<string, PresenceUser>();
      data?.forEach(user => {
        onlineUsersMap.set(user.id, {
          userId: user.id,
          username: user.username || '',
          isOnline: user.is_online,
          lastSeen: user.last_seen || new Date().toISOString()
        });
      });

      setOnlineUsers(onlineUsersMap);
      
      if (shouldLog) {
        // debugLogger.success('PRESENCE_CONTEXT', 'LOAD_SUCCESS', `Loaded ${data?.length || 0} online users`);
        lastLoadLogTimeRef.current = now;
      }
    } catch (error) {
      // debugLogger.error('PRESENCE_CONTEXT', 'LOAD_EXCEPTION', 'Exception loading online users', error);
    }
  };

  // Check if a specific user is online
  const isUserOnline = (userId: string): boolean => {
    const user = onlineUsers.get(userId);
    return user?.isOnline || false;
  };

  // Get full presence info for a user
  const getUserPresence = (userId: string): PresenceUser | null => {
    return onlineUsers.get(userId) || null;
  };

  // Refresh presence data
  const refreshPresence = () => {
    loadOnlineUsers();
  };

  const value: PresenceContextType = {
    onlineUsers,
    isUserOnline,
    getUserPresence,
    refreshPresence
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};
