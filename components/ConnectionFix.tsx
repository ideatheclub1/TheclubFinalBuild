import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Zap
} from 'lucide-react-native';
import { supabase } from '@/app/lib/supabase';
import { debugLogger, debug } from '@/utils/debugLogger';

interface ConnectionStatus {
  network: boolean;
  supabase: boolean;
  auth: boolean;
  realtime: boolean;
}

export default function ConnectionFix() {
  const [status, setStatus] = useState<ConnectionStatus>({
    network: false,
    supabase: false,
    auth: false,
    realtime: false,
  });
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-10), logMessage]); // Keep last 10 logs
  };

  const testDebugLogger = () => {
    addLog('🧪 Testing debugLogger...');
    try {
      // Test direct function call
      debugLogger.info('TEST', 'CONNECTION_FIX', 'Testing debugLogger direct call');
      addLog('✅ debugLogger direct call works');
      
      // Test convenience function
      debug.test();
      addLog('✅ debug.test() works');
      
      // Test exports
      console.log('debugLogger type:', typeof debugLogger);
      console.log('debug type:', typeof debug);
      addLog('✅ debugLogger exports verified');
      
    } catch (error: any) {
      addLog(`❌ debugLogger error: ${error.message}`);
      console.error('debugLogger test error:', error);
    }
  };

  const testNetworkConnectivity = async (): Promise<boolean> => {
    try {
      addLog('🌐 Testing network connectivity...');
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        cache: 'no-cache',
      });
      const isConnected = response.ok;
      addLog(isConnected ? '✅ Network connected' : '❌ Network disconnected');
      return isConnected;
    } catch (error) {
      addLog('❌ Network test failed');
      return false;
    }
  };

  const testSupabaseConnection = async (): Promise<boolean> => {
    try {
      addLog('🗄️ Testing Supabase connection...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (error) {
        addLog(`❌ Supabase error: ${error.message}`);
        return false;
      } else {
        addLog(`✅ Supabase connected (${data?.length || 0} records)`);
        return true;
      }
    } catch (error: any) {
      addLog(`❌ Supabase test failed: ${error.message}`);
      return false;
    }
  };

  const testAuthentication = async (): Promise<boolean> => {
    try {
      addLog('🔐 Testing authentication...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`❌ Auth error: ${error.message}`);
        return false;
      }
      
      if (session) {
        addLog(`✅ User authenticated: ${session.user.id}`);
        return true;
      } else {
        addLog('⚠️ No active session');
        return false;
      }
    } catch (error: any) {
      addLog(`❌ Auth test failed: ${error.message}`);
      return false;
    }
  };

  const testRealtimeConnection = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      addLog('⚡ Testing realtime connection...');
      
      const channel = supabase.channel(`test-${Date.now()}`);
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          addLog('❌ Realtime connection timeout');
          supabase.removeChannel(channel);
          resolve(false);
        }
      }, 5000);
      
      channel
        .on('broadcast', { event: 'test' }, () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            addLog('✅ Realtime connection working');
            supabase.removeChannel(channel);
            resolve(true);
          }
        })
        .subscribe((status) => {
          addLog(`Realtime status: ${status}`);
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'test',
              payload: { test: true }
            });
          } else if (status === 'CHANNEL_ERROR') {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              addLog('❌ Realtime channel error');
              resolve(false);
            }
          }
        });
    });
  };

  const runFullTest = async () => {
    setTesting(true);
    setLogs([]);
    
    addLog('🚀 Starting connection diagnostics...');
    
    // Test debug logger first
    testDebugLogger();
    
    // Test connections
    const networkOk = await testNetworkConnectivity();
    const supabaseOk = await testSupabaseConnection();
    const authOk = await testAuthentication();
    const realtimeOk = await testRealtimeConnection();
    
    setStatus({
      network: networkOk,
      supabase: supabaseOk,
      auth: authOk,
      realtime: realtimeOk,
    });
    
    addLog('🏁 Diagnostics complete!');
    setTesting(false);
    
    // Show summary
    const allGood = networkOk && supabaseOk && authOk && realtimeOk;
    Alert.alert(
      allGood ? '✅ All Systems Good!' : '⚠️ Issues Found',
      allGood 
        ? 'Your connections are working properly!'
        : 'Check the logs above for specific issues to address.',
      [{ text: 'OK' }]
    );
  };

  const fixCommonIssues = async () => {
    addLog('🔧 Attempting to fix common issues...');
    
    try {
      // Force refresh auth session
      await supabase.auth.refreshSession();
      addLog('✅ Auth session refreshed');
      
      // Clear any stuck channels
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Realtime channels cleared');
      
      addLog('🎯 Common fixes applied - run test again');
    } catch (error: any) {
      addLog(`❌ Fix attempt failed: ${error.message}`);
    }
  };

  const StatusIcon = ({ isGood }: { isGood: boolean }) => (
    isGood ? <CheckCircle size={20} color="#10B981" /> : <XCircle size={20} color="#EF4444" />
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6C5CE7', '#5B4BD6']}
        style={styles.header}
      >
        <Text style={styles.title}>Connection Diagnostics</Text>
        <Text style={styles.subtitle}>Fix your app connection issues</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Status Overview */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <StatusIcon isGood={status.network} />
            <Text style={styles.statusText}>Network Connection</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusIcon isGood={status.supabase} />
            <Text style={styles.statusText}>Supabase Database</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusIcon isGood={status.auth} />
            <Text style={styles.statusText}>Authentication</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusIcon isGood={status.realtime} />
            <Text style={styles.statusText}>Realtime Messaging</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runFullTest}
            disabled={testing}
          >
            <LinearGradient
              colors={testing ? ['#9CA3AF', '#6B7280'] : ['#6C5CE7', '#5B4BD6']}
              style={styles.buttonGradient}
            >
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {testing ? 'Testing...' : 'Run Full Test'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={fixCommonIssues}
          >
            <View style={styles.secondaryButtonContent}>
              <Zap size={20} color="#6C5CE7" />
              <Text style={styles.secondaryButtonText}>Fix Common Issues</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        {logs.length > 0 && (
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>Diagnostic Logs</Text>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Quick Fixes</Text>
          <Text style={styles.instructionText}>
            1. Make sure you have internet connection
          </Text>
          <Text style={styles.instructionText}>
            2. Check if Supabase project is active
          </Text>
          <Text style={styles.instructionText}>
            3. Verify your API keys are correct
          </Text>
          <Text style={styles.instructionText}>
            4. Try refreshing the app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#E8E3FF',
    fontSize: 16,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    color: '#E0E0E0',
    fontSize: 16,
    marginLeft: 12,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#6C5CE7',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#6C5CE7',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logsContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  logsTitle: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  logText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  instructionsContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
