import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Message, Conversation } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import { useDebugLogger } from '@/utils/debugLogger';
import NetInfo from '@react-native-community/netinfo';

interface UseMessagingProps {
  conversationId?: string;
  autoMarkAsRead?: boolean;
}

export const useMessaging = ({ conversationId, autoMarkAsRead = true }: UseMessagingProps = {}) => {
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('useMessaging');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Start as connected
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);
  const [typingUsers, setTypingUsers] = useState<any[]>([]); // Simplified typing

  // Polling interval for updates (fallback for real-time)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Check network connectivity
  const checkNetworkStatus = useCallback(async () => {
    try {
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;
      setNetworkStatus(isConnected || false);
      
      if (isConnected) {
        // Test Supabase connection with timeout
        try {
          const testPromise = supabase.from('user_profiles').select('id').limit(1);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout')), 8000)
          );
          
          const { data, error } = await Promise.race([testPromise, timeoutPromise]) as any;
          
          if (error) {
            debugLogger.warn('MESSAGING', 'SUPABASE_CONNECTION_TEST', 'Supabase connection test failed', {
              code: error.code,
              message: error.message,
              details: error.details
            });
            setIsConnected(false);
            setError(`Database connection failed: ${error.message}`);
          } else {
            debugLogger.success('MESSAGING', 'SUPABASE_CONNECTION_TEST', 'Supabase connection test successful', {
              recordCount: data?.length || 0
            });
            setIsConnected(true);
            setError(null);
          }
        } catch (supabaseError: any) {
          const errorMessage = supabaseError.message || 'Unknown database error';
          debugLogger.error('MESSAGING', 'SUPABASE_CONNECTION_ERROR', 'Supabase connection error', {
            error: errorMessage,
            type: supabaseError.name || 'Error'
          });
          setIsConnected(false);
          setError(`Database connection error: ${errorMessage}`);
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      debugLogger.error('MESSAGING', 'NETWORK_CHECK_ERROR', 'Network status check failed', error);
      setNetworkStatus(false);
      setIsConnected(false);
    }
  }, [debugLogger]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) {
      debugLogger.info('MESSAGING', 'LOAD_CONVERSATIONS_SKIP', 'No current user');
      return;
    }

    if (!networkStatus) {
      debugLogger.info('MESSAGING', 'LOAD_CONVERSATIONS_SKIP', 'No network connection');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.info('MESSAGING', 'LOAD_CONVERSATIONS_START', `Loading conversations for user: ${currentUser.id}`);

      const conversations = await dataService.message.getConversations(currentUser.id);
      setConversations(conversations);
      
      debugLogger.info('MESSAGING', 'LOAD_CONVERSATIONS_SUCCESS', `Loaded ${conversations.length} conversations`);
    } catch (err: any) {
      const errorMessage = 'Failed to load conversations';
      setError(errorMessage);
      debugLogger.info('MESSAGING', 'LOAD_CONVERSATIONS_ERROR', errorMessage, err);
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, networkStatus, debugLogger]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || conversationId;
    if (!currentUser?.id || !targetConversationId) {
      debugLogger.info('MESSAGING', 'LOAD_MESSAGES_SKIP', 'Missing user ID or conversation ID');
      return;
    }

    if (!networkStatus) {
      debugLogger.info('MESSAGING', 'LOAD_MESSAGES_SKIP', 'No network connection');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.info('MESSAGING', 'LOAD_MESSAGES_START', `Loading messages for conversation: ${targetConversationId}`);

      const messages = await dataService.message.getMessages(targetConversationId, currentUser.id);
      setMessages(messages);

      if (autoMarkAsRead) {
        await dataService.message.markAsRead(targetConversationId, currentUser.id);
      }

      debugLogger.info('MESSAGING', 'LOAD_MESSAGES_SUCCESS', `Loaded ${messages.length} messages`);
    } catch (err: any) {
      const errorMessage = 'Failed to load messages';
      setError(errorMessage);
      debugLogger.info('MESSAGING', 'LOAD_MESSAGES_ERROR', errorMessage, err);
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, conversationId, autoMarkAsRead, networkStatus, debugLogger]);

  // Send a message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!currentUser?.id || !conversationId || !content.trim()) {
      debugLogger.info('MESSAGING', 'SEND_MESSAGE_SKIP', 'Missing required data for sending message');
      return null;
    }

    if (!networkStatus) {
      debugLogger.info('MESSAGING', 'SEND_MESSAGE_SKIP', 'No network connection');
      setError('No network connection. Message will be sent when connection is restored.');
      return null;
    }

    try {
      setError(null);
      debugLogger.info('MESSAGING', 'SEND_MESSAGE_START', `Sending message to conversation: ${conversationId}`);

      const message = await dataService.message.sendMessage(
        conversationId,
        currentUser.id,
        content.trim(),
        messageType
      );

      if (message) {
        // Add message to local state immediately for optimistic UI
        setMessages(prev => [...prev, message]);
        
        // Update conversations list
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                lastMessage: message,
                updatedAt: message.createdAt || new Date().toISOString()
              }
            : conv
        ));
        
        debugLogger.info('MESSAGING', 'SEND_MESSAGE_SUCCESS', 'Message sent successfully');
        return message;
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err: any) {
      const errorMessage = 'Failed to send message';
      setError(errorMessage);
      debugLogger.info('MESSAGING', 'SEND_MESSAGE_ERROR', errorMessage, err);
      console.error('Send message error:', err);
      return null;
    }
  }, [currentUser?.id, conversationId, networkStatus, debugLogger]);

  // Create a new conversation
  const createConversation = useCallback(async (participants: string[]) => {
    if (!currentUser?.id) {
      debugLogger.info('MESSAGING', 'CREATE_CONVERSATION_SKIP', 'No current user');
      return null;
    }

    if (!networkStatus) {
      debugLogger.info('MESSAGING', 'CREATE_CONVERSATION_SKIP', 'No network connection');
      setError('No network connection. Cannot create conversation.');
      return null;
    }

    try {
      setError(null);
      debugLogger.info('MESSAGING', 'CREATE_CONVERSATION_START', 'Creating new conversation');

      const conversationId = await dataService.message.createConversation(participants);
      
      if (conversationId) {
        debugLogger.info('MESSAGING', 'CREATE_CONVERSATION_SUCCESS', `Conversation created: ${conversationId}`);
        return conversationId;
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (err: any) {
      const errorMessage = 'Failed to create conversation';
      setError(errorMessage);
      debugLogger.info('MESSAGING', 'CREATE_CONVERSATION_ERROR', errorMessage, err);
      console.error('Create conversation error:', err);
      return null;
    }
  }, [currentUser?.id, networkStatus, debugLogger]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id || !messageId) {
      debugLogger.info('MESSAGING', 'DELETE_MESSAGE_SKIP', 'Missing required data for deleting message');
      return false;
    }

    if (!networkStatus) {
      debugLogger.info('MESSAGING', 'DELETE_MESSAGE_SKIP', 'No network connection');
      setError('No network connection. Cannot delete message.');
      return false;
    }

    try {
      setError(null);
      debugLogger.info('MESSAGING', 'DELETE_MESSAGE_START', `Deleting message: ${messageId}`);

      const success = await dataService.message.deleteMessage(messageId, currentUser.id);
      
      if (success) {
        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        debugLogger.info('MESSAGING', 'DELETE_MESSAGE_SUCCESS', 'Message deleted successfully');
        return true;
      } else {
        throw new Error('Failed to delete message');
      }
    } catch (err: any) {
      const errorMessage = 'Failed to delete message';
      setError(errorMessage);
      debugLogger.info('MESSAGING', 'DELETE_MESSAGE_ERROR', errorMessage, err);
      console.error('Delete message error:', err);
      return false;
    }
  }, [currentUser?.id, networkStatus, debugLogger]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!currentUser?.id || !conversationId) {
      debugLogger.info('MESSAGING', 'MARK_AS_READ_SKIP', 'Missing required data for marking as read');
      return false;
    }

    if (!networkStatus) {
      debugLogger.info('MESSAGING', 'MARK_AS_READ_SKIP', 'No network connection');
      return false;
    }

    try {
      debugLogger.info('MESSAGING', 'MARK_AS_READ_START', `Marking messages as read for conversation: ${conversationId}`);

      const success = await dataService.message.markAsRead(conversationId, currentUser.id);
      
      if (success) {
        // Update local state to mark messages as read
        setMessages(prev => prev.map(msg => 
          msg.conversationId === conversationId && msg.senderId !== currentUser.id
            ? { ...msg, isRead: true }
            : msg
        ));
        
        debugLogger.info('MESSAGING', 'MARK_AS_READ_SUCCESS', 'Messages marked as read successfully');
        return true;
      } else {
        throw new Error('Failed to mark messages as read');
      }
    } catch (err: any) {
      debugLogger.info('MESSAGING', 'MARK_AS_READ_ERROR', 'Failed to mark messages as read', err);
      return false;
    }
  }, [currentUser?.id, networkStatus, debugLogger]);

  // Simplified typing functions (no real-time for now)
  const sendTypingIndicator = useCallback(() => {
    debugLogger.info('MESSAGING', 'TYPING_INDICATOR', 'Typing indicator (simplified)');
  }, [debugLogger]);

  const stopTypingIndicator = useCallback(() => {
    debugLogger.info('MESSAGING', 'STOP_TYPING_INDICATOR', 'Stop typing indicator (simplified)');
  }, [debugLogger]);

  const handleTyping = useCallback(() => {
    sendTypingIndicator();
  }, [sendTypingIndicator]);

  // Initialize and setup polling for updates
  useEffect(() => {
    if (!currentUser?.id) return;

    debugLogger.info('MESSAGING', 'INITIALIZE', 'Initializing messaging hook');

    // Initial network check
    checkNetworkStatus();

    // Set up periodic network checks (every 10 seconds)
    connectionCheckRef.current = setInterval(checkNetworkStatus, 10000);

    // Load initial data
    loadConversations();
    
    if (conversationId) {
      loadMessages();
    }

    // Set up polling for conversations (every 30 seconds)
    pollingRef.current = setInterval(() => {
      if (currentUser?.id && networkStatus) {
        loadConversations();
        if (conversationId) {
          loadMessages();
        }
      }
    }, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
        connectionCheckRef.current = null;
      }
      debugLogger.info('MESSAGING', 'CLEANUP', 'Cleaning up messaging hook');
    };
  }, [currentUser?.id, conversationId, loadConversations, loadMessages, checkNetworkStatus, networkStatus, debugLogger]);

  // Update connection status based on network and Supabase connectivity
  useEffect(() => {
    const overallConnection = networkStatus && isConnected;
    debugLogger.info('MESSAGING', 'CONNECTION_STATUS', `Overall connection status: ${overallConnection}`, {
      networkStatus,
      supabaseConnected: isConnected
    });
  }, [networkStatus, isConnected, debugLogger]);

  return {
    // State
    messages,
    conversations,
    loading,
    error,
    isConnected: networkStatus && isConnected, // Combined connection status
    typingUsers,
    
    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    deleteMessage,
    markAsRead,
    sendTypingIndicator,
    stopTypingIndicator,
    handleTyping,
    
    // Additional info
    networkStatus,
    supabaseConnected: isConnected,
    
    // Utils
    clearError: () => setError(null),
  };
};

