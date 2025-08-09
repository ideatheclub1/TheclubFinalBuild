import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { debug, debugLogger } from '@/utils/debugLogger';

const DebugTest = () => {
  const handleTest = () => {
    console.log('🔥 STARTING DEBUG TEST...');
    
    // Direct console.log test
    console.log('1. Direct console.log works!');
    console.warn('2. Direct console.warn works!');
    console.error('3. Direct console.error works!');
    
    // Debug logger test
    const result = debug.test();
    
    // Show alert with result
    Alert.alert('Debug Test', result);
    
    // Additional tests
    debug.pageLoad('DebugTest', { testData: 'sample' });
    debug.userAction('TEST_BUTTON_PRESS', { timestamp: new Date().toISOString() });
    debug.apiCall('test-endpoint', 'GET', { test: true });
    debug.apiSuccess('test-endpoint', 'GET', { success: true }, 250);
    
    console.log('📊 Debug logger stats:');
    console.log('- Enabled:', debugLogger['isEnabled']);
    console.log('- Total logs:', debugLogger.getLogs().length);
    console.log('- Last 3 logs:', debugLogger.getLogs().slice(-3));
  };

  const handleClearLogs = () => {
    debugLogger.clear();
    console.log('🧹 Logs cleared!');
  };

  const handleShowLogs = () => {
    const logs = debugLogger.getLogs();
    console.log('📋 ALL DEBUG LOGS:');
    console.log(JSON.stringify(logs, null, 2));
    Alert.alert('Logs', `Found ${logs.length} logs. Check console for details.`);
  };

  const handleToggleDebug = () => {
    const currentState = debugLogger['isEnabled'];
    debugLogger.setEnabled(!currentState);
    Alert.alert('Debug Logger', `Debug logging ${!currentState ? 'enabled' : 'disabled'}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Logger Test</Text>
      <Text style={styles.subtitle}>Check your terminal/console for output</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleTest}>
        <Text style={styles.buttonText}>🧪 Run Debug Test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleShowLogs}>
        <Text style={styles.buttonText}>📋 Show All Logs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleClearLogs}>
        <Text style={styles.buttonText}>🧹 Clear Logs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleToggleDebug}>
        <Text style={styles.buttonText}>🔄 Toggle Debug Logger</Text>
      </TouchableOpacity>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Where to look for logs:</Text>
        <Text style={styles.infoText}>• Terminal running Metro bundler</Text>
        <Text style={styles.infoText}>• Browser console (if testing in web)</Text>
        <Text style={styles.infoText}>• Expo CLI terminal output</Text>
        <Text style={styles.infoText}>• React Native debugger</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
});

export default DebugTest;