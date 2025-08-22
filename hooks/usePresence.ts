import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { debug, useDebugLogger } from '@/utils/debugLogger';

export const usePresence = () => {
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('Presence');
  const presenceChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastLogTimeRef = useRef<number>(0);

  // Update user presence status
  const updatePresenceStatus = useCallback(async (status: 'online' | 'offline') => {
    if (!currentUser?.id) return;

    try {
      // debugLogger.info('PRESENCE', 'UPDATE_STATUS', `Updating presence to: ${status}`, { userId: currentUser.id });

      // Update user_profiles table
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          is_online: status === 'online',
          last_seen: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) {
        // debugLogger.error('PRESENCE', 'UPDATE_ERROR', 'Failed to update presence', error);
        return;
      }

      // Broadcast presence change to other users
      if (presenceChannelRef.current) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'presence_change',
          payload: {
            userId: currentUser.id,
            username: currentUser.username,
            status: status,
            timestamp: Date.now()
          }
        });
      }

      // debugLogger.success('PRESENCE', 'UPDATE_SUCCESS', `Presence updated to ${status}`);
    } catch (error) {
      // debugLogger.error('PRESENCE', 'UPDATE_EXCEPTION', 'Exception updating presence', error);
    }
  }, [currentUser?.id, currentUser?.username, debugLogger]);

  // Set user online
  const setOnline = useCallback(() => {
    updatePresenceStatus('online');
  }, [updatePresenceStatus]);

  // Set user offline
  const setOffline = useCallback(() => {
    updatePresenceStatus('offline');
  }, [updatePresenceStatus]);

  // Send heartbeat to maintain online status
  const sendHeartbeat = useCallback(async () => {
    if (!currentUser?.id || appStateRef.current !== 'active') return;

    try {
      // Update last_seen timestamp
      await supabase
        .from('user_profiles')
        .update({ 
          last_seen: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      // Log heartbeat success only every 1 minute to reduce spam
      const now = Date.now();
      if (now - lastLogTimeRef.current >= 60000) { // 1 minute = 60000ms
        // debugLogger.info('PRESENCE', 'HEARTBEAT_SUCCESS', 'Heartbeat sent successfully');
        lastLogTimeRef.current = now;
      }
    } catch (error) {
      // debugLogger.error('PRESENCE', 'HEARTBEAT_ERROR', 'Failed to send heartbeat', error);
    }
  }, [currentUser?.id, debugLogger]);

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    // debugLogger.info('PRESENCE', 'APP_STATE_CHANGE', `App state changed: ${appStateRef.current} -> ${nextAppState}`);
    
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      // debugLogger.info('PRESENCE', 'APP_FOREGROUND', 'App came to foreground - setting online');
      setOnline();
    } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App went to background
      // debugLogger.info('PRESENCE', 'APP_BACKGROUND', 'App went to background - setting offline');
      setOffline();
    }

    appStateRef.current = nextAppState;
  }, [setOnline, setOffline, debugLogger]);

  // Initialize presence system
  useEffect(() => {
    if (!currentUser?.id) return;

    // debugLogger.info('PRESENCE', 'INITIALIZE', 'Initializing presence system', { userId: currentUser.id });

    // Set initial online status
    setOnline();

    // Set up presence channel for broadcasting
    presenceChannelRef.current = supabase.channel(`presence-${currentUser.id}`, {
      config: {
        broadcast: { self: false }
      }
    });

    presenceChannelRef.current
      .on('broadcast', { event: 'presence_change' }, (payload: any) => {
        // Only log important presence changes (offline events) to reduce spam
        if (payload?.payload?.status === 'offline') {
          // debugLogger.info('PRESENCE', 'USER_WENT_OFFLINE', `${payload.payload.username} went offline`);
        }
        // This will be handled by conversation components that need to update UI
      })
      .subscribe((status: string) => {
        // Only log channel connection issues, not every status change
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          // debugLogger.warn('PRESENCE', 'CHANNEL_ISSUE', `Presence channel status: ${status}`);
        }
      });

    // Set up heartbeat (every 1 minute for regular presence updates)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 60000) as any;

    // Set up app state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      // debugLogger.info('PRESENCE', 'CLEANUP', 'Cleaning up presence system');
      
      // Set offline before cleanup
      setOffline();

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Unsubscribe from presence channel
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }

      // Remove app state listener
      appStateSubscription?.remove();
    };
  }, [currentUser?.id, setOnline, setOffline, sendHeartbeat, handleAppStateChange, debugLogger]);

  return {
    setOnline,
    setOffline,
    updatePresenceStatus
  };
};
