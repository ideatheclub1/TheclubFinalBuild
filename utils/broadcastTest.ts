/**
 * Broadcast Testing Utility
 * Tests Supabase Realtime Broadcast functionality following official documentation
 */

import { supabase } from '@/app/lib/supabase';
import { debugLogger } from '@/utils/debugLogger';

interface TestMessage {
  id: string;
  message: string;
  sender: string;
  timestamp: number;
}

export class BroadcastTester {
  private channel: any = null;
  private isConnected = false;
  private messageCallback: ((message: TestMessage) => void) | null = null;

  constructor(private channelName: string = 'test-channel') {}

  /**
   * Initialize broadcast connection following Supabase docs
   */
  async connect(): Promise<boolean> {
    try {
      debugLogger.info('BROADCAST_TEST', 'CONNECT_START', 'Initializing broadcast connection');

      // Create channel with acknowledgment enabled (recommended for reliable delivery)
      this.channel = supabase.channel(this.channelName, {
      config: {
          broadcast: {
            self: true,  // Allow receiving our own messages for testing
            ack: true    // Acknowledge receipt
          },
        },
      });

      // Set up message listener following the docs pattern
      this.channel.on(
      'broadcast',
        { event: 'test_message' }, // Listen for "test_message" event
        (payload: any) => this.handleMessage(payload)
      );

      // Subscribe to channel
      const subscriptionPromise = new Promise<boolean>((resolve, reject) => {
        this.channel.subscribe((status: string) => {
          debugLogger.info('BROADCAST_TEST', 'SUBSCRIPTION_STATUS', `Status: ${status}`);
          
        if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            debugLogger.success('BROADCAST_TEST', 'CONNECT_SUCCESS', 'Successfully connected to broadcast channel');
            resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.isConnected = false;
            debugLogger.error('BROADCAST_TEST', 'CONNECT_ERROR', `Connection failed: ${status}`);
            reject(new Error(`Connection failed: ${status}`));
        }
      });
    });

      // Wait for connection with timeout
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );

      return await Promise.race([subscriptionPromise, timeoutPromise]);

    } catch (error) {
      debugLogger.error('BROADCAST_TEST', 'CONNECT_EXCEPTION', 'Failed to connect', error);
      return false;
    }
  }

  /**
   * Send a test message using broadcast
   */
  async sendTestMessage(message: string, sender: string = 'test-user'): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      debugLogger.warn('BROADCAST_TEST', 'SEND_SKIP', 'Not connected to broadcast channel');
      return false;
    }

    try {
      const testMessage: TestMessage = {
        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message,
        sender,
        timestamp: Date.now()
      };

      debugLogger.info('BROADCAST_TEST', 'SEND_START', 'Sending test message', testMessage);

      // Send using broadcast following Supabase docs
      const response = await this.channel.send({
      type: 'broadcast',
        event: 'test_message',
        payload: testMessage,
      });

      debugLogger.success('BROADCAST_TEST', 'SEND_SUCCESS', 'Test message sent', response);
      return true;

    } catch (error) {
      debugLogger.error('BROADCAST_TEST', 'SEND_ERROR', 'Failed to send test message', error);
      return false;
    }
  }

  /**
   * Handle incoming broadcast messages
   */
  private handleMessage(payload: any): void {
    try {
      debugLogger.info('BROADCAST_TEST', 'MESSAGE_RECEIVED', 'Received broadcast message', payload);
      
      const message: TestMessage = payload.payload || payload;
      
      if (this.messageCallback) {
        this.messageCallback(message);
      }
    } catch (error) {
      debugLogger.error('BROADCAST_TEST', 'MESSAGE_HANDLE_ERROR', 'Error handling message', error);
    }
  }

  /**
   * Set callback for incoming messages
   */
  setMessageCallback(callback: (message: TestMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Test broadcast latency
   */
  async testLatency(iterations: number = 5): Promise<{ average: number; results: number[] }> {
    if (!this.isConnected) {
      throw new Error('Not connected to broadcast channel');
    }

    debugLogger.info('BROADCAST_TEST', 'LATENCY_TEST_START', `Testing latency with ${iterations} iterations`);

    const results: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Set up one-time listener for this specific test message
      const testPromise = new Promise<number>((resolve) => {
        const originalCallback = this.messageCallback;
        
        this.messageCallback = (message: TestMessage) => {
          if (message.id.startsWith(`latency-test-${i}`)) {
            const latency = Date.now() - startTime;
            this.messageCallback = originalCallback; // Restore original callback
            resolve(latency);
          } else if (originalCallback) {
            originalCallback(message);
          }
        };
      });

      // Send test message
      await this.sendTestMessage(`Latency test ${i}`, `latency-test-${i}`);
      
      // Wait for response with timeout
      const timeoutPromise = new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error('Latency test timeout')), 5000)
      );

      try {
        const latency = await Promise.race([testPromise, timeoutPromise]);
        results.push(latency);
        debugLogger.info('BROADCAST_TEST', 'LATENCY_RESULT', `Iteration ${i + 1}: ${latency}ms`);
      } catch (error) {
        debugLogger.warn('BROADCAST_TEST', 'LATENCY_TIMEOUT', `Iteration ${i + 1} timed out`);
        results.push(-1); // Indicate timeout
      }

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const validResults = results.filter(r => r > 0);
    const average = validResults.length > 0 
      ? validResults.reduce((sum, val) => sum + val, 0) / validResults.length 
      : -1;

    debugLogger.success('BROADCAST_TEST', 'LATENCY_TEST_COMPLETE', `Average latency: ${average}ms`, {
      results,
      validResults: validResults.length,
      totalTests: iterations
    });

    return { average, results };
  }

  /**
   * Test message ordering
   */
  async testMessageOrdering(count: number = 10): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Not connected to broadcast channel');
    }

    debugLogger.info('BROADCAST_TEST', 'ORDER_TEST_START', `Testing message ordering with ${count} messages`);

    const receivedMessages: TestMessage[] = [];
    const originalCallback = this.messageCallback;

    // Set up message collector
    this.messageCallback = (message: TestMessage) => {
      if (message.id.startsWith('order-test-')) {
        receivedMessages.push(message);
      } else if (originalCallback) {
        originalCallback(message);
      }
    };

    // Send messages rapidly
    const sentMessages: TestMessage[] = [];
    for (let i = 0; i < count; i++) {
      const message: TestMessage = {
        id: `order-test-${i.toString().padStart(3, '0')}`,
        message: `Order test message ${i}`,
        sender: 'order-tester',
        timestamp: Date.now()
      };
      
      sentMessages.push(message);
      await this.sendTestMessage(message.message, message.id);
      
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for all messages to arrive
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Restore original callback
    this.messageCallback = originalCallback;

    // Check ordering
    const isOrdered = receivedMessages.every((msg, index) => {
      const expectedId = `order-test-${index.toString().padStart(3, '0')}`;
      return msg.id === expectedId;
    });

    debugLogger.info('BROADCAST_TEST', 'ORDER_TEST_COMPLETE', `Messages received in order: ${isOrdered}`, {
      sent: sentMessages.length,
      received: receivedMessages.length,
      ordered: isOrdered
    });

    return isOrdered && receivedMessages.length === sentMessages.length;
  }

  /**
   * Disconnect from broadcast channel
   */
  disconnect(): void {
    if (this.channel) {
      debugLogger.info('BROADCAST_TEST', 'DISCONNECT', 'Disconnecting from broadcast channel');
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isConnected = false;
      this.messageCallback = null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

/**
 * Run comprehensive broadcast tests
 */
export async function runBroadcastTests(): Promise<{
  connection: boolean;
  messaging: boolean;
  latency: { average: number; results: number[] };
  ordering: boolean;
}> {
  const tester = new BroadcastTester(`broadcast-test-${Date.now()}`);

  try {
    // Test 1: Connection
    debugLogger.info('BROADCAST_TEST', 'SUITE_START', 'Starting comprehensive broadcast tests');
    const connectionResult = await tester.connect();

    if (!connectionResult) {
      throw new Error('Failed to establish broadcast connection');
    }

    // Test 2: Basic messaging
    let messageReceived = false;
    tester.setMessageCallback((message) => {
      if (message.message === 'Hello Broadcast!') {
        messageReceived = true;
      }
    });

    await tester.sendTestMessage('Hello Broadcast!', 'test-sender');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for message

    // Test 3: Latency
    const latencyResult = await tester.testLatency(3);

    // Test 4: Message ordering
    const orderingResult = await tester.testMessageOrdering(5);

    // Cleanup
    tester.disconnect();

    const results = {
      connection: connectionResult,
      messaging: messageReceived,
      latency: latencyResult,
      ordering: orderingResult
    };

    debugLogger.success('BROADCAST_TEST', 'SUITE_COMPLETE', 'All broadcast tests completed', results);
    return results;

  } catch (error) {
    debugLogger.error('BROADCAST_TEST', 'SUITE_ERROR', 'Broadcast test suite failed', error);
    tester.disconnect();
    throw error;
  }
}

/**
 * Quick broadcast connection test
 */
export async function quickBroadcastTest(): Promise<boolean> {
  const tester = new BroadcastTester(`quick-test-${Date.now()}`);

  try {
    const connected = await tester.connect();
    
    if (connected) {
      await tester.sendTestMessage('Quick test message');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    tester.disconnect();
    return connected;
  } catch (error) {
    debugLogger.error('BROADCAST_TEST', 'QUICK_TEST_ERROR', 'Quick test failed', error);
    tester.disconnect();
    return false;
  }
}