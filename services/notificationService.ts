import { Platform, Alert } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { debug, debugLogger } from '@/utils/debugLogger';

export interface PushNotificationData {
  type: 'message' | 'follow' | 'like' | 'comment' | 'booking';
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    senderId?: string;
    senderName?: string;
    messageId?: string;
    userId?: string;
    postId?: string;
    [key: string]: any;
  };
}

class SimpleNotificationService {
  private isInitialized = false;

  // Initialize notification service (simplified)
  async initialize(userId: string): Promise<boolean> {
    try {
      debugLogger.info('NOTIFICATIONS', 'SIMPLE_INIT', '🔔 Initializing simple notification service');
      this.isInitialized = true;
      debugLogger.success('NOTIFICATIONS', 'INIT_SUCCESS', '✅ Simple notification service initialized');
      console.log('✅ Messaging system ready - notifications will show in console');
      return true;
    } catch (error) {
      debugLogger.error('NOTIFICATIONS', 'INIT_ERROR', 'Failed to initialize notification service', error);
      return false;
    }
  }

  // Send message notification (simplified - shows console log)
  async sendMessageNotification(
    recipientUserId: string,
    senderName: string,
    messageContent: string,
    conversationId: string,
    senderId: string
  ): Promise<boolean> {
    try {
      debugLogger.info('NOTIFICATIONS', 'SEND_MESSAGE', 'Sending message notification', {
        recipientUserId,
        senderName,
        conversationId
      });

      // Console log instead of actual notification (for now)
      console.log(`📱 NEW MESSAGE from ${senderName}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
      
      return true;
    } catch (error) {
      debugLogger.error('NOTIFICATIONS', 'SEND_ERROR', 'Failed to send notification', error);
      return false;
    }
  }

  // Send push notification (simplified)
  async sendPushNotification(targetUserId: string, data: PushNotificationData): Promise<boolean> {
    try {
      debugLogger.process('NOTIFICATIONS', 'SEND_PUSH', `Preparing push notification to user: ${targetUserId}`);
      console.log(`📤 Push notification to ${targetUserId}: ${data.title}`);
      return true;
    } catch (error) {
      debugLogger.error('NOTIFICATIONS', 'PUSH_ERROR', 'Error preparing push notification', error);
      return false;
    }
  }

  // Send local notification (simplified)
  async sendLocalNotification(data: PushNotificationData): Promise<boolean> {
    try {
      debugLogger.process('NOTIFICATIONS', 'SEND_LOCAL', `Sending local notification: ${data.title}`);
      console.log(`📱 Local notification: ${data.title} - ${data.body}`);
      return true;
    } catch (error) {
      debugLogger.error('NOTIFICATIONS', 'LOCAL_ERROR', 'Error sending local notification', error);
      return false;
    }
  }

  // Handle incoming notifications (simplified)
  handleNotifications(): void {
    debugLogger.info('NOTIFICATIONS', 'HANDLE', 'Setting up notification handlers');
    console.log('🔔 Notification handlers ready');
  }

  // Get badge count (simplified)
  async getBadgeCount(): Promise<number> {
    return 0;
  }

  // Set badge count (simplified)
  async setBadgeCount(count: number): Promise<void> {
    debugLogger.info('NOTIFICATIONS', 'BADGE_SET', `Badge count would be set to: ${count}`);
    console.log(`📱 Badge count: ${count}`);
  }

  // Clear all notifications (simplified)
  async clearAllNotifications(): Promise<void> {
    debugLogger.info('NOTIFICATIONS', 'CLEAR_ALL', 'All notifications cleared');
    console.log('🧹 All notifications cleared');
  }

  // Cleanup
  cleanup(): void {
    debugLogger.info('NOTIFICATIONS', 'CLEANUP', 'Cleaning up notification service');
    this.isInitialized = false;
    console.log('🧹 Notification service cleaned up');
  }

  // Legacy compatibility getters
  get isReady(): boolean {
    return this.isInitialized;
  }

  get pushToken(): string | null {
    return null;
  }
}

// Export singleton instance
export const notificationService = new SimpleNotificationService();

// Export notification helper functions
export const notificationHelpers = {
  // Format message for notification
  formatMessageForNotification: (content: string, maxLength: number = 50): string => {
    if (content.includes('Sent a image')) return '📷 Photo';
    if (content.includes('Sent a video')) return '🎥 Video';  
    if (content.includes('Sent a document')) return '📄 Document';
    
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  },

  // Create message notification data
  createMessageNotificationData: (
    senderName: string,
    message: string,
    conversationId: string,
    senderId: string
  ): PushNotificationData => ({
    type: 'message',
    title: `New message from ${senderName}`,
    body: notificationHelpers.formatMessageForNotification(message),
    data: {
      conversationId,
      senderId,
      senderName,
      type: 'message',
    },
  }),
};