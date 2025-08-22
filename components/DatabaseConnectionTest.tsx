import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { testSupabaseConnection, checkNetworkConnectivity } from '@/utils/connectionTest';
import { runFullDatabaseDiagnostic } from '@/utils/databaseVerification';
import { useDebugLogger } from '@/utils/debugLogger';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ConnectionStatus {
  network: boolean;
  database: boolean;
  overall: boolean;
  error?: string;
  lastCheck?: Date;
}

export default function DatabaseConnectionTest() {
  const debugLogger = useDebugLogger('DatabaseConnectionTest');
  const [status, setStatus] = useState<ConnectionStatus>({
    network: false,
    database: false,
    overall: false
  });
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    debugLogger.info('CONNECTION_TEST', 'START', 'Starting database connection test');

    try {
      // Test network connectivity
      const networkResult = await checkNetworkConnectivity();
      
      // Test database connection
      const dbResult = await testSupabaseConnection();
      
      const newStatus: ConnectionStatus = {
        network: networkResult.success,
        database: dbResult.success,
        overall: networkResult.success && dbResult.success,
        error: dbResult.success ? undefined : dbResult.error,
        lastCheck: new Date()
      };

      setStatus(newStatus);

      debugLogger.info('CONNECTION_TEST', 'COMPLETE', 'Connection test completed', {
        network: newStatus.network,
        database: newStatus.database,
        overall: newStatus.overall,
        error: newStatus.error
      });

      // Run full diagnostic if database connection failed
      if (!dbResult.success) {
        debugLogger.info('CONNECTION_TEST', 'RUNNING_DIAGNOSTIC', 'Running full database diagnostic');
        try {
          const diagnostic = await runFullDatabaseDiagnostic();
          
          Alert.alert(
            'Database Connection Analysis',
            `Network: ${networkResult.success ? '✅' : '❌'}\n` +
            `Database: ${dbResult.success ? '✅' : '❌'}\n\n` +
            `Tables Accessible: ${diagnostic.summary.tablesAccessible}/${diagnostic.summary.totalTables}\n` +
            `User Authenticated: ${diagnostic.summary.userAuthenticated ? '✅' : '❌'}\n` +
            `RLS Active: ${diagnostic.summary.rlsActive ? '✅' : '❌'}\n\n` +
            `${dbResult.error ? `Error: ${dbResult.error}` : ''}`,
            [{ text: 'OK' }]
          );
        } catch (diagnosticError) {
          Alert.alert(
            'Connection Test Results',
            `Network: ${networkResult.success ? '✅ Connected' : '❌ Disconnected'}\n` +
            `Database: ${dbResult.success ? '✅ Connected' : '❌ Disconnected'}\n` +
            `${dbResult.error ? `Error: ${dbResult.error}` : ''}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Connection Test Results',
          `Network: ${networkResult.success ? '✅ Connected' : '❌ Disconnected'}\n` +
          `Database: ${dbResult.success ? '✅ Connected' : '❌ Disconnected'}\n` +
          `All systems operational!`,
          [{ text: 'OK' }]
        );
      }

    } catch (error: any) {
      debugLogger.error('CONNECTION_TEST', 'ERROR', 'Connection test failed', error);
      setStatus({
        network: false,
        database: false,
        overall: false,
        error: error.message || 'Test failed',
        lastCheck: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  // Auto-test on component mount
  useEffect(() => {
    testConnection();
  }, []);

  const getStatusIcon = (isConnected: boolean) => {
    if (isConnected) {
      return <CheckCircle size={20} color="#4CAF50" />;
    }
    return <XCircle size={20} color="#FF6B6B" />;
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? '#4CAF50' : '#FF6B6B';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Connection Status</Text>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          {getStatusIcon(status.network)}
          <Text style={[styles.statusText, { color: getStatusColor(status.network) }]}>
            Network: {status.network ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          {getStatusIcon(status.database)}
          <Text style={[styles.statusText, { color: getStatusColor(status.database) }]}>
            Database: {status.database ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          {getStatusIcon(status.overall)}
          <Text style={[styles.statusText, { color: getStatusColor(status.overall) }]}>
            Overall: {status.overall ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {status.error && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{status.error}</Text>
        </View>
      )}

      {status.lastCheck && (
        <Text style={styles.lastCheckText}>
          Last checked: {status.lastCheck.toLocaleTimeString()}
        </Text>
      )}

      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testConnection}
        disabled={testing}
      >
        <RefreshCw size={16} color="#FFFFFF" />
        <Text style={styles.testButtonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 8,
    flex: 1,
  },
  lastCheckText: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#6C5CE7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
