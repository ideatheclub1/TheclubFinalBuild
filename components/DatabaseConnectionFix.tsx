import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react-native';

export default function DatabaseConnectionFix() {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    try {
      console.log('🔧 Testing database connection...');
      
      // Test 1: Health check
      const startTime = Date.now();
      const { data: healthData, error: healthError } = await supabase.from('user_profiles').select('id').limit(1);
      const healthDuration = Date.now() - startTime;
      
      const healthResult = {
        healthy: !healthError,
        error: healthError?.message,
        duration: healthDuration,
        recordCount: healthData?.length || 0
      };
      console.log('Health check result:', healthResult);
      
      // Test 2: Direct query
      const directStartTime = Date.now();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .limit(1);
      const duration = Date.now() - directStartTime;
      
      const result = {
        health: healthResult,
        direct: {
          success: !error,
          error: error?.message,
          duration: duration,
          recordCount: data?.length || 0
        }
      };
      
      setLastResult(result);
      
      Alert.alert(
        'Database Connection Test',
        `Health Check: ${healthResult.healthy ? '✅ Healthy' : '❌ Unhealthy'}\n` +
        `Health Duration: ${healthResult.duration}ms\n` +
        `Health Error: ${healthResult.error || 'None'}\n\n` +
        `Direct Query: ${result.direct.success ? '✅ Success' : '❌ Failed'}\n` +
        `Direct Duration: ${result.direct.duration}ms\n` +
        `Direct Error: ${result.direct.error || 'None'}\n` +
        `Records Found: ${result.direct.recordCount}`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      Alert.alert('Connection Test Failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (!lastResult) return <RefreshCw size={16} color="#666" />;
    const isHealthy = lastResult.health?.healthy && lastResult.direct?.success;
    return isHealthy ? 
      <CheckCircle size={16} color="#4CAF50" /> : 
      <XCircle size={16} color="#FF6B6B" />;
  };

  const getStatusText = () => {
    if (!lastResult) return 'Not tested';
    const isHealthy = lastResult.health?.healthy && lastResult.direct?.success;
    return isHealthy ? 'Connection OK' : 'Connection Issues';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {getStatusIcon()}
        <Text style={styles.title}>DB Connection Fix</Text>
      </View>
      
      <Text style={styles.status}>{getStatusText()}</Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={testConnection}
        disabled={testing}
      >
        <RefreshCw size={14} color="#FFFFFF" />
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  status: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#6C5CE7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
