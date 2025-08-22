// React Native optimized Supabase client
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const SUPABASE_URL = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

// React Native optimized configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 5  // Lower for mobile
    }
  },
  global: {
    headers: {
      'x-client-info': 'the-club-app@1.0.0',
      'user-agent': `the-club-app/${Platform.OS}`,
    },
    fetch: (url, options = {}) => {
      // Add React Native specific optimizations
      const optimizedOptions = {
        ...options,
        // Lower timeout for mobile
        timeout: 10000,
        headers: {
          ...options.headers,
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        }
      };
      
      return fetch(url, optimizedOptions);
    }
  }
});

// React Native specific timeout wrapper
export const withRNTimeout = <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`React Native query timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Optimized messaging queries for React Native
export const RNMessagingQueries = {
  // Test connection with short timeout
  testConnection: () => {
    return withRNTimeout(
      supabase
        .from('user_profiles')
        .select('id')
        .limit(1),
      3000 // Very short timeout for connection test
    );
  },

  // Get conversations with optimized query
  getConversations: (userId: string) => {
    return withRNTimeout(
      supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          updated_at
        `)
        .limit(20) // Limit results for faster loading
        .order('updated_at', { ascending: false }),
      6000 // 6 second timeout
    );
  },

  // Get messages with pagination
  getMessages: (conversationId: string, limit: number = 50) => {
    return withRNTimeout(
      supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          conversation_id,
          created_at,
          is_read,
          message_type
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit),
      5000 // 5 second timeout
    );
  }
};

// React Native specific health check
export const checkRNDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    console.log('🔧 Starting RN database health check...');
    
    const { data, error } = await RNMessagingQueries.testConnection();
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ RN health check took ${duration}ms`);
    
    if (error) {
      console.error('❌ RN health check failed:', error.message);
      return {
        healthy: false,
        error: error.message,
        duration: duration,
        platform: Platform.OS
      };
    }
    
    console.log('✅ RN health check successful');
    return {
      healthy: true,
      duration: duration,
      recordCount: data?.length || 0,
      platform: Platform.OS
    };
  } catch (error: any) {
    const duration = 3000;
    console.error('❌ RN health check exception:', error.message);
    return {
      healthy: false,
      error: error.message || 'Connection timeout',
      duration: duration,
      platform: Platform.OS
    };
  }
};

// Initialize with immediate test
console.log('🚀 Initializing React Native Supabase client...');
checkRNDatabaseHealth().then(result => {
  if (result.healthy) {
    console.log(`✅ RN Supabase ready (${result.duration}ms on ${result.platform})`);
  } else {
    console.error(`❌ RN Supabase issues: ${result.error} (${result.duration}ms on ${result.platform})`);
  }
}).catch(err => {
  console.error('❌ RN Supabase initialization failed:', err);
});

export default supabase;
