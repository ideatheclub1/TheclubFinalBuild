import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { debugLogger, debug } from '@/utils/debugLogger';

export default function QuickDebugger() {
  const [dbStatus, setDbStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'not-authenticated'>('checking');
  const [debuggerStatus, setDebuggerStatus] = useState<'testing' | 'working' | 'broken'>('testing');

  useEffect(() => {
    runQuickTests();
  }, []);

  const runQuickTests = async () => {
    // Test 1: Debug Logger
    console.log('🧪 QUICK DEBUGGER: Starting tests...');
    
    try {
      debugLogger.info('QUICK_DEBUG', 'TEST', 'Testing debugLogger direct call');
      debug.test();
      setDebuggerStatus('working');
      console.log('✅ debugLogger is working');
    } catch (error) {
      setDebuggerStatus('broken');
      console.error('❌ debugLogger error:', error);
    }

    // Test 2: Database Connection
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (error) {
        setDbStatus('failed');
        console.error('❌ Database error:', error);
      } else {
        setDbStatus('connected');
        console.log('✅ Database connected');
      }
    } catch (error) {
      setDbStatus('failed');
      console.error('❌ Database connection failed:', error);
    }

    // Test 3: Authentication
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setAuthStatus('not-authenticated');
        console.error('❌ Auth error:', error);
      } else if (session) {
        setAuthStatus('authenticated');
        console.log('✅ User authenticated:', session.user.id);
      } else {
        setAuthStatus('not-authenticated');
        console.log('⚠️ No active session');
      }
    } catch (error) {
      setAuthStatus('not-authenticated');
      console.error('❌ Auth test failed:', error);
    }
  };

  const handleFixIssues = async () => {
    console.log('🔧 Attempting to fix issues...');
    
    try {
      // Refresh auth session
      await supabase.auth.refreshSession();
      console.log('✅ Auth session refreshed');
      
      // Re-run tests
      await runQuickTests();
      
      Alert.alert('Fix Attempt', 'Attempted fixes applied. Check console for results.');
    } catch (error) {
      console.error('❌ Fix attempt failed:', error);
      Alert.alert('Fix Failed', 'Could not apply fixes. Check console for details.');
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('working') || status.includes('connected') || status.includes('authenticated')) {
      return '#10B981'; // Green
    }
    if (status.includes('testing') || status.includes('checking')) {
      return '#F59E0B'; // Yellow
    }
    return '#EF4444'; // Red
  };

  const getStatusText = (status: string) => {
    return status.replace('-', ' ').toUpperCase();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐛 Quick Debugger</Text>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: getStatusColor(debuggerStatus) }]} />
          <Text style={styles.statusText}>Debug Logger: {getStatusText(debuggerStatus)}</Text>
        </View>
        
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: getStatusColor(dbStatus) }]} />
          <Text style={styles.statusText}>Database: {getStatusText(dbStatus)}</Text>
        </View>
        
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: getStatusColor(authStatus) }]} />
          <Text style={styles.statusText}>Auth: {getStatusText(authStatus)}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={runQuickTests}>
          <Text style={styles.buttonText}>🔄 Retest</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleFixIssues}>
          <Text style={styles.buttonText}>🔧 Fix Issues</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        Check console for detailed logs. This debugger tests your core connections.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instruction: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
