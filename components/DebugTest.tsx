import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useDebugLogger, debug } from '@/utils/debugLogger';

export default function DebugTest() {
  const debugLogger = useDebugLogger('DebugTest');

  useEffect(() => {
    debug.pageLoad('DebugTest component loaded');
    debug.userAction('DebugTest mounted');
  }, []);

  const testDebugFunctions = () => {
    debug.userAction('Test button pressed');
    debug.apiCall('/test', 'GET', { test: true });
    debug.dbQuery('test_table', 'SELECT', { limit: 10 });
    debug.searchStart('test query', { filters: { category: 'test' } });
    
    setTimeout(() => {
      debug.apiSuccess('/test', 'GET', { data: 'test response' }, 500);
      debug.dbSuccess('test_table', 'SELECT', { results: ['item1', 'item2'] }, 300);
      debug.searchComplete('test query', ['result1', 'result2'], 800);
    }, 1000);
  };

  const testError = () => {
    debug.userAction('Error test button pressed');
    debug.apiError('/test', 'GET', { error: 'Test error message' });
    debug.dbError('test_table', 'SELECT', { error: 'Database test error' });
    debug.searchError('test query', { error: 'Search test error' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug System Test</Text>
      <Text style={styles.subtitle}>Check terminal for colored logs</Text>
      
      <TouchableOpacity style={styles.button} onPress={testDebugFunctions}>
        <Text style={styles.buttonText}>Test Debug Functions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.errorButton]} onPress={testError}>
        <Text style={styles.buttonText}>Test Error Logging</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        Look for the 🐛 button in the top-right corner to open the debug panel!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
  },
  errorButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
}); 