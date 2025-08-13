import { supabase } from '@/app/lib/supabase';
import { debugLogger } from './debugLogger';

export const verifyDatabaseTables = async () => {
  const debug = debugLogger;
  
  const tablesToCheck = [
    'user_profiles',
    'conversations', 
    'messages',
    'posts',
    'reels',
    'followers',
    'likes',
    'comments'
  ];

  const results: any = {};

  for (const table of tablesToCheck) {
    try {
      debug.info('TABLE_CHECK', 'START', `Checking table: ${table}`);
      
      // Test if table exists and is accessible
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        debug.error('TABLE_CHECK', 'FAILED', `Table ${table} check failed`, {
          code: error.code,
          message: error.message,
          details: error.details
        });
        results[table] = {
          accessible: false,
          error: error.message,
          code: error.code
        };
      } else {
        debug.success('TABLE_CHECK', 'SUCCESS', `Table ${table} is accessible`, {
          recordCount: count
        });
        results[table] = {
          accessible: true,
          recordCount: count || 0
        };
      }
    } catch (err: any) {
      debug.error('TABLE_CHECK', 'ERROR', `Error checking table ${table}`, err);
      results[table] = {
        accessible: false,
        error: err.message || 'Unknown error'
      };
    }
  }

  return results;
};

export const checkRowLevelSecurity = async () => {
  const debug = debugLogger;
  
  try {
    debug.info('RLS_CHECK', 'START', 'Checking Row Level Security policies');
    
    // Try to access user_profiles without authentication
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST103') {
        debug.warn('RLS_CHECK', 'RLS_ACTIVE', 'RLS is active - authentication required', error);
        return {
          rlsActive: true,
          requiresAuth: true,
          message: 'Row Level Security is active - user authentication required'
        };
      } else {
        debug.error('RLS_CHECK', 'ERROR', 'RLS check failed with unexpected error', error);
        return {
          rlsActive: false,
          error: error.message,
          message: 'Unexpected database error'
        };
      }
    } else {
      debug.success('RLS_CHECK', 'PUBLIC_ACCESS', 'Public access allowed', { recordCount: data?.length });
      return {
        rlsActive: false,
        requiresAuth: false,
        message: 'Public access allowed'
      };
    }
  } catch (err: any) {
    debug.error('RLS_CHECK', 'EXCEPTION', 'RLS check exception', err);
    return {
      rlsActive: false,
      error: err.message,
      message: 'Failed to check RLS status'
    };
  }
};

export const checkCurrentUser = async () => {
  const debug = debugLogger;
  
  try {
    debug.info('USER_CHECK', 'START', 'Checking current user authentication');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      debug.error('USER_CHECK', 'ERROR', 'Failed to get current user', error);
      return {
        authenticated: false,
        error: error.message,
        user: null
      };
    }
    
    if (user) {
      debug.success('USER_CHECK', 'AUTHENTICATED', 'User is authenticated', {
        userId: user.id,
        email: user.email
      });
      return {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        }
      };
    } else {
      debug.info('USER_CHECK', 'NOT_AUTHENTICATED', 'No user is currently authenticated');
      return {
        authenticated: false,
        user: null,
        message: 'No user is currently authenticated'
      };
    }
  } catch (err: any) {
    debug.error('USER_CHECK', 'EXCEPTION', 'User check exception', err);
    return {
      authenticated: false,
      error: err.message,
      user: null
    };
  }
};

export const runFullDatabaseDiagnostic = async () => {
  const debug = debugLogger;
  
  debug.info('DIAGNOSTIC', 'START', 'Running full database diagnostic');
  
  const [tableResults, rlsResults, userResults] = await Promise.all([
    verifyDatabaseTables(),
    checkRowLevelSecurity(),
    checkCurrentUser()
  ]);
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    tables: tableResults,
    rls: rlsResults,
    user: userResults,
    summary: {
      tablesAccessible: Object.values(tableResults).filter((t: any) => t.accessible).length,
      totalTables: Object.keys(tableResults).length,
      userAuthenticated: userResults.authenticated,
      rlsActive: rlsResults.rlsActive
    }
  };
  
  debug.success('DIAGNOSTIC', 'COMPLETE', 'Full diagnostic completed', diagnostic.summary);
  
  return diagnostic;
};

