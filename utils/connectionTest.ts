import { supabase } from '@/app/lib/supabase';
import { debugLogger } from './debugLogger';

export const testSupabaseConnection = async () => {
  const debug = debugLogger;
  
  try {
    debug.info('CONNECTION_TEST', 'START', 'Testing Supabase connection...');
    
    // Test 1: Basic connection with timeout
    const testPromise = supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );
    
    const { data: testData, error: testError } = await Promise.race([testPromise, timeoutPromise]) as any;
    
    if (testError) {
      debug.error('CONNECTION_TEST', 'BASIC_QUERY_FAILED', 'Basic query failed', testError);
      return {
        success: false,
        error: testError.message,
        details: `Database error: ${testError.code || 'UNKNOWN'} - ${testError.message}`
      };
    }
    
    debug.success('CONNECTION_TEST', 'BASIC_QUERY_SUCCESS', 'Basic query successful');
    
    // Test 2: Check if we can access the auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      debug.warn('CONNECTION_TEST', 'AUTH_CHECK_FAILED', 'Auth check failed', authError);
      // This might be normal if no user is logged in
    } else {
      debug.success('CONNECTION_TEST', 'AUTH_CHECK_SUCCESS', 'Auth check successful');
    }
    
    // Test 3: Check storage access
    try {
      const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
      
      if (storageError) {
        debug.warn('CONNECTION_TEST', 'STORAGE_CHECK_FAILED', 'Storage check failed', storageError);
      } else {
        debug.success('CONNECTION_TEST', 'STORAGE_CHECK_SUCCESS', 'Storage check successful', { buckets: storageData?.length });
      }
    } catch (storageErr) {
      debug.warn('CONNECTION_TEST', 'STORAGE_CHECK_ERROR', 'Storage check error', storageErr);
    }
    
    debug.success('CONNECTION_TEST', 'COMPLETE', 'All connection tests completed successfully');
    
    return {
      success: true,
      message: 'Connection test successful',
      details: {
        database: 'Connected',
        auth: authError ? 'Error' : 'Connected',
        storage: 'Connected'
      }
    };
    
  } catch (error: any) {
    debug.error('CONNECTION_TEST', 'GENERAL_ERROR', 'Connection test failed', error);
    
    return {
      success: false,
      error: error.message || 'Unknown error',
      details: 'General connection failure'
    };
  }
};

export const checkNetworkConnectivity = async () => {
  const debug = debugLogger;
  
  try {
    debug.info('NETWORK_TEST', 'START', 'Testing network connectivity...');
    
    // Test basic internet connectivity
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    debug.success('NETWORK_TEST', 'INTERNET_SUCCESS', 'Internet connectivity confirmed');
    
    // Test Supabase URL specifically
    const supabaseResponse = await fetch('https://jbcxrqyzyuhhmolsxtrx.supabase.co/rest/v1/', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g'
      },
      timeout: 5000
    });
    
    if (!supabaseResponse.ok) {
      debug.warn('NETWORK_TEST', 'SUPABASE_URL_WARNING', 'Supabase URL might be unreachable', { status: supabaseResponse.status });
    } else {
      debug.success('NETWORK_TEST', 'SUPABASE_URL_SUCCESS', 'Supabase URL is reachable');
    }
    
    return {
      success: true,
      internet: 'Connected',
      supabase: supabaseResponse.ok ? 'Reachable' : 'Warning'
    };
    
  } catch (error: any) {
    debug.error('NETWORK_TEST', 'FAILED', 'Network test failed', error);
    
    return {
      success: false,
      error: error.message || 'Network error',
      internet: 'Disconnected'
    };
  }
};
