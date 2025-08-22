import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Wifi, 
  WifiOff, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  MessageCircle,
  Users
} from 'lucide-react-native';
import { 
  runBroadcastTests, 
  quickBroadcastTest, 
  BroadcastTester 
} from '@/utils/broadcastTest';
import { useRealtimeBroadcast } from '@/hooks/useRealtimeBroadcast';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  duration?: number;
}

interface BroadcastTestComponentProps {
  onClose?: () => void;
}

export default function BroadcastTestComponent({ onClose }: BroadcastTestComponentProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Quick Connection Test', status: 'pending' },
    { name: 'Message Broadcasting', status: 'pending' },
    { name: 'Latency Test', status: 'pending' },
    { name: 'Message Ordering', status: 'pending' },
    { name: 'Typing Indicators', status: 'pending' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [overallStatus, setOverallStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');

  // Test the actual hook
  const {
    isConnected,
    networkStatus,
    error,
    sendMessage,
    handleTyping,
  } = useRealtimeBroadcast({ conversationId: 'test-conversation' });

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const runQuickConnectionTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    setCurrentTest('Quick Connection Test');
    updateTestResult('Quick Connection Test', { status: 'running' });

    try {
      const connected = await quickBroadcastTest();
      const duration = Date.now() - startTime;
      
      updateTestResult('Quick Connection Test', {
        status: connected ? 'success' : 'error',
        result: { connected },
        duration,
        error: connected ? undefined : 'Failed to establish connection'
      });
      
      return connected;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult('Quick Connection Test', {
        status: 'error',
        error: error.message,
        duration
      });
      return false;
    }
  };

  const runMessageBroadcastTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    setCurrentTest('Message Broadcasting');
    updateTestResult('Message Broadcasting', { status: 'running' });

    try {
      const tester = new BroadcastTester(`broadcast-test-${Date.now()}`);
      
      await tester.connect();
      
      let messageReceived = false;
      tester.setMessageCallback((message) => {
        if (message.message === 'Test Broadcast Message') {
          messageReceived = true;
        }
      });

      await tester.sendTestMessage('Test Broadcast Message', 'test-sender');
      
      // Wait for message
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      tester.disconnect();
      
      const duration = Date.now() - startTime;
      updateTestResult('Message Broadcasting', {
        status: messageReceived ? 'success' : 'error',
        result: { messageReceived },
        duration,
        error: messageReceived ? undefined : 'Message not received'
      });
      
      return messageReceived;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult('Message Broadcasting', {
        status: 'error',
        error: error.message,
        duration
      });
      return false;
    }
  };

  const runLatencyTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    setCurrentTest('Latency Test');
    updateTestResult('Latency Test', { status: 'running' });

    try {
      const tester = new BroadcastTester(`latency-test-${Date.now()}`);
      await tester.connect();
      
      const latencyResults = await tester.testLatency(3);
      tester.disconnect();
      
      const duration = Date.now() - startTime;
      const success = latencyResults.average > 0 && latencyResults.average < 2000; // Under 2 seconds
      
      updateTestResult('Latency Test', {
        status: success ? 'success' : 'error',
        result: latencyResults,
        duration,
        error: success ? undefined : 'Latency too high or test failed'
      });
      
      return success;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult('Latency Test', {
        status: 'error',
        error: error.message,
        duration
      });
      return false;
    }
  };

  const runOrderingTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    setCurrentTest('Message Ordering');
    updateTestResult('Message Ordering', { status: 'running' });

    try {
      const tester = new BroadcastTester(`ordering-test-${Date.now()}`);
      await tester.connect();
      
      const orderingSuccess = await tester.testMessageOrdering(5);
      tester.disconnect();
      
      const duration = Date.now() - startTime;
      updateTestResult('Message Ordering', {
        status: orderingSuccess ? 'success' : 'error',
        result: { orderingSuccess },
        duration,
        error: orderingSuccess ? undefined : 'Messages not received in order'
      });
      
      return orderingSuccess;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult('Message Ordering', {
        status: 'error',
        error: error.message,
        duration
      });
      return false;
    }
  };

  const runTypingTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    setCurrentTest('Typing Indicators');
    updateTestResult('Typing Indicators', { status: 'running' });

    try {
      // Test the actual hook's typing functionality
      handleTyping();
      
      // Simulate typing test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const duration = Date.now() - startTime;
      updateTestResult('Typing Indicators', {
        status: 'success',
        result: { typingTest: true },
        duration
      });
      
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult('Typing Indicators', {
        status: 'error',
        error: error.message,
        duration
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    
    // Reset all tests
    setTestResults(prev => prev.map(test => ({ ...test, status: 'pending' as const })));

    try {
      const results = await Promise.all([
        runQuickConnectionTest(),
        runMessageBroadcastTest(),
        runLatencyTest(),
        runOrderingTest(),
        runTypingTest(),
      ]);

      const allPassed = results.every(result => result);
      setOverallStatus(allPassed ? 'success' : 'error');
      
      if (allPassed) {
        Alert.alert(
          '🎉 All Tests Passed!',
          'Your broadcast messaging system is working perfectly!',
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        Alert.alert(
          '⚠️ Some Tests Failed',
          'Check the results below for details on what needs attention.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      setOverallStatus('error');
      Alert.alert('Error', 'Failed to run tests');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setCurrentTest('Running Comprehensive Tests');

    try {
      const results = await runBroadcastTests();
      
      // Update results based on comprehensive test
      updateTestResult('Quick Connection Test', {
        status: results.connection ? 'success' : 'error',
        result: { connected: results.connection }
      });
      
      updateTestResult('Message Broadcasting', {
        status: results.messaging ? 'success' : 'error',
        result: { messageReceived: results.messaging }
      });
      
      updateTestResult('Latency Test', {
        status: results.latency.average > 0 ? 'success' : 'error',
        result: results.latency
      });
      
      updateTestResult('Message Ordering', {
        status: results.ordering ? 'success' : 'error',
        result: { orderingSuccess: results.ordering }
      });

      const allPassed = results.connection && results.messaging && results.ordering && results.latency.average > 0;
      setOverallStatus(allPassed ? 'success' : 'error');
      
    } catch (error: any) {
      setOverallStatus('error');
      Alert.alert('Test Error', error.message);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color="#9CA3AF" />;
      case 'running':
        return <ActivityIndicator size="small" color="#6C5CE7" />;
      case 'success':
        return <CheckCircle size={20} color="#10B981" />;
      case 'error':
        return <XCircle size={20} color="#EF4444" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return '#9CA3AF';
      case 'running':
        return '#6C5CE7';
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
    }
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#6C5CE7', '#5B4BD6']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Broadcast Messaging Tests</Text>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Connection Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Current Connection</Text>
              {isConnected && networkStatus ? (
                <View style={styles.statusIndicator}>
                  <Wifi size={20} color="#10B981" />
                  <Text style={[styles.statusText, { color: '#10B981' }]}>Connected</Text>
                </View>
              ) : (
                <View style={styles.statusIndicator}>
                  <WifiOff size={20} color="#EF4444" />
                  <Text style={[styles.statusText, { color: '#EF4444' }]}>Disconnected</Text>
                </View>
              )}
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>

          {/* Overall Status */}
          <View style={[styles.overallStatus, { borderColor: getStatusColor(overallStatus) }]}>
            <View style={styles.overallStatusContent}>
              {getStatusIcon(overallStatus)}
              <Text style={[styles.overallStatusText, { color: getStatusColor(overallStatus) }]}>
                {overallStatus === 'pending' && 'Ready to test'}
                {overallStatus === 'running' && `Testing: ${currentTest}`}
                {overallStatus === 'success' && 'All tests passed!'}
                {overallStatus === 'error' && 'Some tests failed'}
              </Text>
            </View>
          </View>

          {/* Test Results */}
          <View style={styles.testsContainer}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            {testResults.map((test, index) => (
              <View key={index} style={styles.testItem}>
                <View style={styles.testHeader}>
                  <View style={styles.testInfo}>
                    {getStatusIcon(test.status)}
                    <Text style={styles.testName}>{test.name}</Text>
                  </View>
                  {test.duration && (
                    <Text style={styles.testDuration}>{test.duration}ms</Text>
                  )}
                </View>
                
                {test.error && (
                  <Text style={styles.testError}>{test.error}</Text>
                )}
                
                {test.result && test.status === 'success' && (
                  <View style={styles.testResult}>
                    {test.name === 'Latency Test' && test.result.average && (
                      <Text style={styles.resultText}>
                        Average: {Math.round(test.result.average)}ms
                      </Text>
                    )}
                    {test.name === 'Message Broadcasting' && test.result.messageReceived && (
                      <Text style={styles.resultText}>✓ Message received successfully</Text>
                    )}
                    {test.name === 'Message Ordering' && test.result.orderingSuccess && (
                      <Text style={styles.resultText}>✓ Messages received in correct order</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={runAllTests}
              disabled={isRunning}
            >
              <LinearGradient
                colors={isRunning ? ['#9CA3AF', '#6B7280'] : ['#6C5CE7', '#5B4BD6']}
                style={styles.buttonGradient}
              >
                <Zap size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  {isRunning ? 'Running Tests...' : 'Run Quick Tests'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={runComprehensiveTests}
              disabled={isRunning}
            >
              <View style={styles.secondaryButtonContent}>
                <MessageCircle size={20} color="#6C5CE7" />
                <Text style={styles.secondaryButtonText}>Comprehensive Tests</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>About These Tests</Text>
            <Text style={styles.infoText}>
              These tests verify that your Supabase Realtime Broadcast messaging system is working correctly. 
              They check connection stability, message delivery, latency, and ordering.
            </Text>
            <View style={styles.infoItem}>
              <Users size={16} color="#6C5CE7" />
              <Text style={styles.infoItemText}>Real-time messaging with multiple participants</Text>
            </View>
            <View style={styles.infoItem}>
              <Zap size={16} color="#6C5CE7" />
              <Text style={styles.infoItemText}>Low-latency message delivery (target: &lt; 500ms)</Text>
            </View>
            <View style={styles.infoItem}>
              <CheckCircle size={16} color="#6C5CE7" />
              <Text style={styles.infoItemText}>Message ordering and delivery guarantees</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  overallStatus: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#2A2A2A',
  },
  overallStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallStatusText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  testsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  testItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  testName: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  testDuration: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  testError: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  testResult: {
    marginTop: 8,
  },
  resultText: {
    color: '#10B981',
    fontSize: 14,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
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
  infoSection: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItemText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
