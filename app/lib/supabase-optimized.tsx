// Optimized Supabase client with connection pooling and timeout handling
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

// Create optimized Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'the-club-app@1.0.0'
    }
  },
  db: {
    schema: 'public'
  }
});

// Helper function to add timeout to any Supabase query
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
};

// Optimized query builders with timeouts
export const supabaseQueries = {
  // Get conversations with timeout
  getConversations: (userId: string) => {
    return withTimeout(
      supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          updated_at,
          conversation_participants!inner(
            user_id,
            joined_at,
            left_at,
            user_profiles(id, username, name, profile_image)
          )
        `)
        .eq('conversation_participants.user_id', userId)
        .is('conversation_participants.left_at', null)
        .order('updated_at', { ascending: false })
        .limit(50),
      8000 // 8 second timeout
    );
  },

  // Get messages with timeout
  getMessages: (conversationId: string) => {
    return withTimeout(
      supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          conversation_id,
          created_at,
          updated_at,
          is_read,
          message_type,
          user_profiles(id, username, name, profile_image)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100),
      5000 // 5 second timeout
    );
  },

  // Send message with timeout
  sendMessage: (message: any) => {
    return withTimeout(
      supabase
        .from('messages')
        .insert(message)
        .select(`
          id,
          content,
          sender_id,
          conversation_id,
          created_at,
          updated_at,
          is_read,
          message_type,
          user_profiles(id, username, name, profile_image)
        `)
        .single(),
      5000 // 5 second timeout
    );
  },

  // Test connection with short timeout
  testConnection: () => {
    return withTimeout(
      supabase
        .from('user_profiles')
        .select('id')
        .limit(1),
      3000 // 3 second timeout
    );
  }
};

// Connection health checker
export const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseQueries.testConnection();
    const duration = Date.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        error: error.message,
        duration: duration
      };
    }
    
    return {
      healthy: true,
      duration: duration,
      recordCount: data?.length || 0
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message || 'Connection timeout',
      duration: 3000
    };
  }
};

// Test connection on initialization with better error handling
checkDatabaseHealth().then(result => {
  if (result.healthy) {
    console.log(`✅ Supabase connection healthy (${result.duration}ms)`);
  } else {
    console.error(`❌ Supabase connection issues: ${result.error} (${result.duration}ms)`);
  }
}).catch(err => {
  console.error('❌ Supabase health check failed:', err);
});

export default supabase;
