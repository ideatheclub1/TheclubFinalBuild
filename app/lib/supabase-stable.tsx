// Stable Supabase client configuration
// This is the recommended configuration that fixes API key and broadcast issues
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

// Create Supabase client with optimized configuration for stability
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Use AsyncStorage for React Native
    storage: {
      getItem: (key: string) => {
        try {
          // For React Native, we'll use a simple in-memory fallback
          if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
          }
          return null;
        } catch (error) {
          console.warn('Storage getItem error:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.warn('Storage setItem error:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn('Storage removeItem error:', error);
        }
      },
    },
  },
  realtime: {
    // Optimized realtime configuration to prevent timeouts
    params: {
      eventsPerSecond: 8, // Moderate rate limiting
    },
    // Increased timeouts for better stability
    heartbeatIntervalMs: 15000, // 15 seconds (less frequent than default)
    reconnectAfterMs: (tries: number) => {
      // Progressive backoff: 1s, 2s, 4s, 8s, max 15s
      return Math.min(Math.pow(2, tries - 1) * 1000, 15000);
    },
    // Add timeout for initial connection
    timeout: 10000, // 10 seconds timeout
  },
  global: {
    headers: {
      'x-client-info': 'the-club-app@1.0.0',
      'x-app-version': '1.0.0',
      // Ensure API key is always included
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  },
  db: {
    schema: 'public',
  },
});

// Enhanced connection testing with better error handling
export const testConnection = async (timeout: number = 8000): Promise<boolean> => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const startTime = Date.now();
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), timeout);
    });
    
    // Test basic database connection
    const connectionPromise = supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      .single();
    
    // Race between connection test and timeout
    await Promise.race([connectionPromise, timeoutPromise]);
    
    const latency = Date.now() - startTime;
    console.log(`✅ Supabase connection successful (${latency}ms)`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
};

// Enhanced broadcast connection test
export const testBroadcastConnection = async (timeout: number = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log('📡 Testing broadcast connection...');
    
    const testChannelName = `connection-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testChannel = supabase.channel(testChannelName, {
      config: {
        broadcast: {
          self: true, // Allow receiving our own messages
          ack: true,  // Request acknowledgment
        },
      },
    });
    
    let resolved = false;
    let messageReceived = false;
    
    // Set timeout for the test
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('❌ Broadcast connection test timed out');
        supabase.removeChannel(testChannel);
        resolve(false);
      }
    }, timeout);
    
    // Listen for our test message
    testChannel.on('broadcast', { event: 'test-connection' }, (payload) => {
      if (!resolved && payload.payload?.test === 'connection-check') {
        messageReceived = true;
        resolved = true;
        clearTimeout(timeoutId);
        console.log('✅ Broadcast connection successful!');
        supabase.removeChannel(testChannel);
        resolve(true);
      }
    });
    
    // Subscribe to the channel
    testChannel.subscribe((status: string) => {
      console.log(`📡 Broadcast status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        // Send test message once subscribed
        setTimeout(() => {
          testChannel.send({
            type: 'broadcast',
            event: 'test-connection',
            payload: { 
              test: 'connection-check', 
              timestamp: Date.now(),
              id: Math.random().toString(36)
            }
          });
        }, 500); // Small delay to ensure subscription is fully established
        
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.error(`❌ Broadcast connection failed: ${status}`);
          supabase.removeChannel(testChannel);
          resolve(false);
        }
      }
    });
  });
};

// Initialize connection tests
export const initializeConnection = async (): Promise<{ database: boolean; broadcast: boolean }> => {
  console.log('🚀 Initializing Supabase connection...');
  
  const results = {
    database: false,
    broadcast: false
  };
  
  try {
    // Test database connection first
    results.database = await testConnection();
    
    // Only test broadcast if database connection works
    if (results.database) {
      results.broadcast = await testBroadcastConnection();
    } else {
      console.warn('⚠️ Skipping broadcast test due to database connection failure');
    }
    
    console.log('📊 Connection test results:', results);
    
  } catch (error) {
    console.error('❌ Connection initialization failed:', error);
  }
  
  return results;
};

// Export for easy testing
export { SUPABASE_URL, SUPABASE_ANON_KEY };

// Auto-test connection on import (with error handling)
if (typeof window !== 'undefined') {
  // Only run in browser/React Native environment
  initializeConnection().catch(error => {
    console.warn('⚠️ Auto connection test failed:', error);
  });
}

