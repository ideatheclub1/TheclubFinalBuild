// Enhanced Supabase client configuration for broadcast messaging
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Supabase configuration
export const SUPABASE_URL = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

// Enhanced Supabase client for broadcast messaging
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Session management
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Enhanced session configuration
    storage: {
      getItem: (key: string) => {
        // Custom storage adapter for React Native
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      },
    },
  },
  realtime: {
    // Optimized realtime configuration for messaging
    params: {
      eventsPerSecond: 10, // Limit broadcast rate to prevent spam
    },
    // Enhanced error handling
    heartbeatIntervalMs: 30000, // 30 seconds
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000), // Exponential backoff up to 30s
  },
  global: {
    headers: {
      'x-client-info': 'the-club-app@1.0.0',
      'x-app-version': '1.0.0',
    },
  },
  // Enhanced database configuration
  db: {
    schema: 'public',
  },
});

// Connection state management
let isConnected = false;
let connectionCallbacks: ((connected: boolean) => void)[] = [];

// Connection status tracker
export const onConnectionChange = (callback: (connected: boolean) => void) => {
  connectionCallbacks.push(callback);
  // Immediately call with current status
  callback(isConnected);
  
  // Return cleanup function
  return () => {
    connectionCallbacks = connectionCallbacks.filter(cb => cb !== callback);
  };
};

// Test connection with enhanced error handling
const testConnection = async (): Promise<boolean> => {
  try {
    const startTime = Date.now();
    
    // Test database connectivity
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Supabase connection test failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        latency: `${latency}ms`
      });
      setConnectionStatus(false);
      return false;
    } else {
      console.log('✅ Supabase connection test successful:', {
        recordCount: data?.length || 0,
        latency: `${latency}ms`,
        timestamp: new Date().toISOString()
      });
      setConnectionStatus(true);
      return true;
    }
  } catch (err: any) {
    console.error('❌ Supabase connection test exception:', {
      error: err.message,
      type: err.name,
      timestamp: new Date().toISOString()
    });
    setConnectionStatus(false);
    return false;
  }
};

// Set connection status and notify callbacks
const setConnectionStatus = (connected: boolean) => {
  if (isConnected !== connected) {
    isConnected = connected;
    connectionCallbacks.forEach(callback => callback(connected));
  }
};

// Test broadcast connectivity
const testBroadcastConnection = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const testChannel = supabase.channel(`connection-test-${Date.now()}`);
    let resolved = false;
    
    // Set timeout for test
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('❌ Broadcast connection test timed out');
        supabase.removeChannel(testChannel);
        resolve(false);
      }
    }, 5000);
    
    testChannel
      .on('broadcast', { event: 'test' }, (payload) => {
        if (!resolved && payload.payload?.test === 'connection') {
          resolved = true;
          clearTimeout(timeout);
          console.log('✅ Broadcast messaging is working!');
          supabase.removeChannel(testChannel);
          resolve(true);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime broadcast channel subscribed');
          testChannel.send({
            type: 'broadcast',
            event: 'test',
            payload: { test: 'connection', timestamp: Date.now() }
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.error('❌ Realtime broadcast connection failed:', status);
            supabase.removeChannel(testChannel);
            resolve(false);
          }
        }
      });
  });
};

// Enhanced connection monitoring
let connectionInterval: NodeJS.Timeout | null = null;

const startConnectionMonitoring = () => {
  // Initial connection test
  testConnection();
  
  // Periodic connection testing (every 30 seconds)
  connectionInterval = setInterval(async () => {
    await testConnection();
  }, 30000);
  
  // Test broadcast on startup
  setTimeout(async () => {
    const broadcastWorking = await testBroadcastConnection();
    if (!broadcastWorking) {
      console.warn('⚠️ Broadcast messaging may not be working properly');
    }
  }, 2000);
};

const stopConnectionMonitoring = () => {
  if (connectionInterval) {
    clearInterval(connectionInterval);
    connectionInterval = null;
  }
};

// App state change handling
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    // App became active, test connection
    testConnection();
  } else if (nextAppState === 'background') {
    // App went to background, reduce monitoring
    stopConnectionMonitoring();
  }
});

// Start monitoring on initialization
startConnectionMonitoring();

// Enhanced error handling for realtime
supabase.realtime.setAuth(null); // Will be set when user authenticates

// Helper functions for broadcast messaging
export const createBroadcastChannel = (
  channelName: string, 
  options: {
    self?: boolean;
    ack?: boolean;
    heartbeat?: boolean;
  } = {}
) => {
  const { self = false, ack = true, heartbeat = true } = options;
  
  return supabase.channel(channelName, {
    config: {
      broadcast: { 
        self, 
        ack 
      },
    },
  });
};

// Utility function to send broadcast with retry
export const sendBroadcastWithRetry = async (
  channel: any,
  event: string,
  payload: any,
  maxRetries: number = 3
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          timestamp: Date.now(),
          attempt
        }
      });
      
      console.log(`✅ Broadcast sent successfully on attempt ${attempt}:`, response);
      return true;
    } catch (error) {
      console.warn(`⚠️ Broadcast attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} broadcast attempts failed`);
        return false;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return false;
};

// Connection status getter
export const getConnectionStatus = (): boolean => isConnected;

// Manual connection test
export const manualConnectionTest = async (): Promise<{
  database: boolean;
  broadcast: boolean;
  latency: number;
}> => {
  const startTime = Date.now();
  
  const [databaseResult, broadcastResult] = await Promise.all([
    testConnection(),
    testBroadcastConnection()
  ]);
  
  const latency = Date.now() - startTime;
  
  return {
    database: databaseResult,
    broadcast: broadcastResult,
    latency
  };
};

// Cleanup function
export const cleanupSupabase = () => {
  stopConnectionMonitoring();
  connectionCallbacks = [];
};

// Enhanced logging
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  if (args[0]?.includes?.('Supabase') || args[0]?.includes?.('✅') || args[0]?.includes?.('❌')) {
    originalLog(`[${new Date().toISOString()}]`, ...args);
  } else {
    originalLog(...args);
  }
};

console.error = (...args) => {
  if (args[0]?.includes?.('Supabase') || args[0]?.includes?.('❌')) {
    originalError(`[${new Date().toISOString()}]`, ...args);
  } else {
    originalError(...args);
  }
};

// Export enhanced client as default
export default supabase;
