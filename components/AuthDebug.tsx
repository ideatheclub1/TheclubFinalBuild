import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';

export default function AuthDebug() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const checkAuthStatus = async () => {
    setTesting(true);
    try {
      console.log('🔐 Checking auth status...');
      
      // Check session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session check error:', sessionError);
        setAuthStatus('unauthenticated');
        setSessionInfo({ error: sessionError.message });
      } else if (sessionData.session) {
        console.log('✅ Session found:', sessionData.session.user?.id);
        setAuthStatus('authenticated');
        setSessionInfo({
          userId: sessionData.session.user?.id,
          email: sessionData.session.user?.email,
          expiresAt: new Date(sessionData.session.expires_at * 1000).toLocaleString()
        });
      } else {
        console.log('ℹ️ No active session');
        setAuthStatus('unauthenticated');
        setSessionInfo({ message: 'No active session' });
      }
    } catch (error: any) {
      console.error('❌ Auth check failed:', error);
      setAuthStatus('unauthenticated');
      setSessionInfo({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const clearAuth = async () => {
    try {
      console.log('🗑️ Clearing auth session...');
      await supabase.auth.signOut();
      setAuthStatus('unauthenticated');
      setSessionInfo({ message: 'Session cleared' });
      Alert.alert('Success', 'Authentication cleared. Try logging in again.');
    } catch (error: any) {
      console.error('❌ Clear auth failed:', error);
      Alert.alert('Error', 'Failed to clear auth: ' + error.message);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id);
      if (session) {
        setAuthStatus('authenticated');
        setSessionInfo({
          userId: session.user?.id,
          email: session.user?.email,
          event: event
        });
      } else {
        setAuthStatus('unauthenticated');
        setSessionInfo({ message: 'No session', event: event });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getStatusIcon = () => {
    if (testing) return <RefreshCw size={14} color="#FFA500" />;
    return authStatus === 'authenticated' ? 
      <CheckCircle size={14} color="#4CAF50" /> : 
      <XCircle size={14} color="#FF6B6B" />;
  };

  const getStatusColor = () => {
    if (testing) return '#FFA500';
    return authStatus === 'authenticated' ? '#4CAF50' : '#FF6B6B';
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <View style={styles.header}>
        {getStatusIcon()}
        <Text style={[styles.title, { color: getStatusColor() }]}>
          Auth Debug
        </Text>
      </View>
      
      <Text style={styles.status}>
        Status: {authStatus === 'checking' ? 'Checking...' : 
                authStatus === 'authenticated' ? 'Logged In' : 'Not Logged In'}
      </Text>
      
      {sessionInfo && (
        <View style={styles.info}>
          {sessionInfo.userId && (
            <Text style={styles.infoText}>ID: {sessionInfo.userId.substring(0, 8)}...</Text>
          )}
          {sessionInfo.email && (
            <Text style={styles.infoText}>Email: {sessionInfo.email}</Text>
          )}
          {sessionInfo.error && (
            <Text style={styles.errorText}>Error: {sessionInfo.error}</Text>
          )}
          {sessionInfo.message && (
            <Text style={styles.infoText}>Info: {sessionInfo.message}</Text>
          )}
        </View>
      )}
      
      <View style={styles.buttons}>
        <TouchableOpacity 
          style={[styles.button, styles.checkButton]} 
          onPress={checkAuthStatus}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Check</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearAuth}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 10,
    margin: 4,
    borderWidth: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  status: {
    fontSize: 10,
    color: '#B0B0B0',
    marginBottom: 6,
  },
  info: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 9,
    color: '#888',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 9,
    color: '#FF6B6B',
    marginBottom: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#6C5CE7',
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
