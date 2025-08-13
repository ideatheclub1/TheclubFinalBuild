import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';

// Simple health check function
const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    const duration = Date.now() - startTime;
    
    if (error) {
      return { healthy: false, error: error.message, duration };
    }
    
    return { healthy: true, duration, recordCount: data?.length || 0 };
  } catch (error: any) {
    return { healthy: false, error: error.message || 'Connection timeout', duration: 3000 };
  }
};
import { dataService } from '@/services/dataService';
import { Message, Conversation } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { useDebugLogger } from '@/utils/debugLogger';
import NetInfo from '@react-native-community/netinfo';

interface UseMessagingProps {
  conversationId?: string;
  autoMarkAsRead?: boolean;
}

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

export const useMessaging = ({ conversationId, autoMarkAsRead = true }: UseMessagingProps = {}) => {
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('useMessagingBroadcast');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) {
      debugLogger.info('LOAD_CONVERSATIONS_SKIP', 'No current user');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.info('LOAD_CONVERSATIONS_START', `Loading conversations for user: ${currentUser.id}`);

      const conversations = await dataService.message.getConversations(currentUser.id);
      setConversations(conversations);
      
      debugLogger.info('LOAD_CONVERSATIONS_SUCCESS', `Loaded ${conversations.length} conversations`);
    } catch (err: any) {
      const errorMessage = 'Failed to load conversations';
      setError(errorMessage);
      debugLogger.info('LOAD_CONVERSATIONS_ERROR', errorMessage, err);
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, debugLogger]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || conversationId;
    if (!currentUser?.id || !targetConversationId) {
      debugLogger.info('LOAD_MESSAGES_SKIP', 'Missing user ID or conversation ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.info('LOAD_MESSAGES_START', `Loading messages for conversation: ${targetConversationId}`);

      const messages = await dataService.message.getMessages(targetConversationId, currentUser.id);
      setMessages(messages);

      if (autoMarkAsRead) {
        await dataService.message.markAsRead(targetConversationId, currentUser.id);
      }

      debugLogger.info('LOAD_MESSAGES_SUCCESS', `Loaded ${messages.length} messages`);
    } catch (err: any) {
      const errorMessage = 'Failed to load messages';
      setError(errorMessage);
      debugLogger.info('LOAD_MESSAGES_ERROR', errorMessage, err);
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, conversationId, autoMarkAsRead, debugLogger]);

  // Send a message using broadcast
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!currentUser?.id || !conversationId || !content.trim()) {
      debugLogger.info('SEND_MESSAGE_SKIP', 'Missing required data for sending message');
      return null;
    }

    try {
      debugLogger.info('SEND_MESSAGE_START', `Sending message to conversation: ${conversationId}`);

      // Save message to database first
      const message = await dataService.message.sendMessage(
        conversationId,
        currentUser.id,
        content.trim(),
        messageType
      );

      if (message) {
        // Add message to local state immediately for optimistic UI
        setMessages(prev => [...prev, message]);
        debugLogger.info('SEND_MESSAGE_SUCCESS', 'Message sent successfully');
        
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

        // Broadcast the message to other participants
        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: {
                message,
                conversationId,
                senderId: currentUser.id,
                timestamp: Date.now()
              }
            });
            debugLogger.info('BROADCAST_MESSAGE_SUCCESS', 'Message broadcasted to participants');
          } catch (broadcastError) {
            debugLogger.info('BROADCAST_MESSAGE_ERROR', 'Failed to broadcast message', broadcastError);
            // Don't fail the whole operation if broadcast fails
          }
        }
      }

      return message;
    } catch (err: any) {
      const errorMessage = 'Failed to send message';
      setError(errorMessage);
      debugLogger.info('SEND_MESSAGE_ERROR', errorMessage, err);
      console.error('Send message error:', err);
      return null;
    }
  }, [currentUser?.id, conversationId, debugLogger]);

  // Create conversation
  const createConversation = useCallback(async (participants: string[]) => {
    if (!currentUser?.id) {
      debugLogger.info('CREATE_CONVERSATION_SKIP', 'No current user');
      return null;
    }

    try {
      debugLogger.info('CREATE_CONVERSATION_START', `Creating conversation with ${participants.length} participants`);

      const conversationId = await dataService.message.createConversation([currentUser.id, ...participants]);
      
      if (conversationId) {
        debugLogger.info('CREATE_CONVERSATION_SUCCESS', `Created conversation: ${conversationId}`);
        
        // Refresh conversations
        await loadConversations();
      }

      return conversationId;
    } catch (err: any) {
      const errorMessage = 'Failed to create conversation';
      setError(errorMessage);
      debugLogger.info('CREATE_CONVERSATION_ERROR', errorMessage, err);
      console.error('Create conversation error:', err);
      return null;
    }
  }, [currentUser?.id, debugLogger, loadConversations]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id) {
      debugLogger.info('DELETE_MESSAGE_SKIP', 'No current user');
      return false;
    }

    try {
      debugLogger.info('DELETE_MESSAGE_START', `Deleting message: ${messageId}`);

      const success = await dataService.message.deleteMessage(messageId, currentUser.id);
      
      if (success) {
        // Remove from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        debugLogger.info('DELETE_MESSAGE_SUCCESS', 'Message deleted successfully');

        // Broadcast deletion to other participants
        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: 'broadcast',
              event: 'message_deleted',
              payload: {
                messageId,
                conversationId,
                userId: currentUser.id,
                timestamp: Date.now()
              }
            });
            debugLogger.info('BROADCAST_DELETE_SUCCESS', 'Message deletion broadcasted');
          } catch (broadcastError) {
            debugLogger.info('BROADCAST_DELETE_ERROR', 'Failed to broadcast deletion', broadcastError);
          }
        }
      }

      return success;
    } catch (err: any) {
      const errorMessage = 'Failed to delete message';
      setError(errorMessage);
      debugLogger.info('DELETE_MESSAGE_ERROR', errorMessage, err);
      console.error('Delete message error:', err);
      return false;
    }
  }, [currentUser?.id, conversationId, debugLogger]);

  // Mark messages as read
  const markAsRead = useCallback(async (convId: string) => {
    if (!currentUser?.id) return false;

    try {
      const success = await dataService.message.markAsRead(convId, currentUser.id);
      
      if (success) {
        // Update local state
        setMessages(prev => prev.map(msg => 
          msg.conversationId === convId && msg.senderId !== currentUser.id
            ? { ...msg, isRead: true }
            : msg
        ));
        
        setConversations(prev => prev.map(conv => 
          conv.id === convId
            ? { ...conv, unreadCount: 0 }
            : conv
        ));

        // Broadcast read status to other participants
        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: 'broadcast',
              event: 'messages_read',
              payload: {
                conversationId: convId,
                userId: currentUser.id,
                timestamp: Date.now()
              }
            });
            debugLogger.info('BROADCAST_READ_SUCCESS', 'Read status broadcasted');
          } catch (broadcastError) {
            debugLogger.info('BROADCAST_READ_ERROR', 'Failed to broadcast read status', broadcastError);
          }
        }
      }

      return success;
    } catch (err: any) {
      debugLogger.info('MARK_READ_ERROR', 'Failed to mark messages as read', err);
      return false;
    }
  }, [currentUser?.id, debugLogger]);

  // Typing indicators using broadcast
  const sendTypingIndicator = useCallback(async () => {
    if (!currentUser?.id || !conversationId || !channelRef.current) return;

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUser.id,
          username: currentUser.username || 'Someone',
          conversationId,
          timestamp: Date.now(),
        },
      });

      debugLogger.info('TYPING_SENT', 'Typing indicator sent');
    } catch (err) {
      debugLogger.info('TYPING_ERROR', 'Failed to send typing indicator', err);
    }
  }, [currentUser, conversationId, debugLogger]);

  // Stop typing indicator
  const stopTypingIndicator = useCallback(async () => {
    if (!currentUser?.id || !conversationId || !channelRef.current) return;

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: {
          userId: currentUser.id,
          conversationId,
          timestamp: Date.now(),
        },
      });

      debugLogger.info('STOP_TYPING_SENT', 'Stop typing indicator sent');
    } catch (err) {
      debugLogger.info('STOP_TYPING_ERROR', 'Failed to send stop typing indicator', err);
    }
  }, [currentUser, conversationId, debugLogger]);

  // Handle typing with automatic stop
  const handleTyping = useCallback(() => {
    sendTypingIndicator();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingIndicator();
    }, 3000);
  }, [sendTypingIndicator, stopTypingIndicator]);

  // Check network connectivity
  const checkNetworkStatus = useCallback(async () => {
    try {
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && netInfo.isInternetReachable;
      setNetworkStatus(isConnected || false);
      
      if (isConnected) {
        // Test Supabase connection with timeout
        try {
          debugLogger.info('BROADCAST', 'CONNECTION_TEST_START', 'Starting Supabase connection test');
          const startTime = Date.now();
          
          const testPromise = supabase.from('user_profiles').select('id').limit(1);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout')), 10000)
          );
          
          const { data, error } = await Promise.race([testPromise, timeoutPromise]) as any;
          const testDuration = Date.now() - startTime;
          
          debugLogger.info('BROADCAST', 'CONNECTION_TEST_COMPLETE', `Connection test completed in ${testDuration}ms`);
          
          if (error) {
            debugLogger.warn('BROADCAST', 'SUPABASE_CONNECTION_TEST', 'Supabase connection test failed', {
              code: error.code,
              message: error.message,
              details: error.details
            });
            setIsConnected(false);
            setError(`Database connection failed: ${error.message}`);
          } else {
            debugLogger.success('BROADCAST', 'SUPABASE_CONNECTION_TEST', 'Supabase connection test successful', {
              recordCount: data?.length || 0
            });
            setIsConnected(true);
            setError(null);
          }
        } catch (supabaseError: any) {
          const errorMessage = supabaseError.message || 'Unknown database error';
          debugLogger.error('BROADCAST', 'SUPABASE_CONNECTION_ERROR', 'Supabase connection error', {
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
      debugLogger.error('BROADCAST', 'NETWORK_CHECK_ERROR', 'Network status check failed', error);
      setNetworkStatus(false);
      setIsConnected(false);
    }
  }, [debugLogger]);

  // Setup Broadcast channel
  useEffect(() => {
    if (!currentUser?.id) return;

    debugLogger.info('SETUP_BROADCAST', 'Setting up Supabase Broadcast channel');

    try {
      // Create channel with unique name based on user or conversation
      const channelName = conversationId ? `conversation-${conversationId}` : `user-${currentUser.id}`;
      
      channelRef.current = supabase.channel(channelName, {
        config: {
          broadcast: { 
            self: false,  // Don't receive our own messages
            ack: true     // Acknowledge receipt
          },
        },
      });

      // Listen for new messages
      channelRef.current.on(
        'broadcast',
        { event: 'new_message' },
        (payload: any) => {
          try {
            debugLogger.info('RECEIVED_MESSAGE', 'New message received via broadcast', payload);
            
            const { message, senderId } = payload.payload;
            
            // Only add if it's not from the current user and for current conversation
            if (senderId !== currentUser.id && (!conversationId || message.conversationId === conversationId)) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(msg => msg.id === message.id)) return prev;
                return [...prev, message];
              });
              
              // Update conversations list
              setConversations(prev => prev.map(conv => 
                conv.id === message.conversationId
                  ? { 
                      ...conv, 
                      lastMessage: message,
                      unreadCount: conv.unreadCount + 1,
                      updatedAt: message.createdAt || new Date().toISOString()
                    }
                  : conv
              ));
            }
          } catch (err) {
            debugLogger.info('PROCESS_MESSAGE_ERROR', 'Error processing received message', err);
          }
        }
      );

      // Listen for message deletions
      channelRef.current.on(
        'broadcast',
        { event: 'message_deleted' },
        (payload: any) => {
          try {
            debugLogger.info('RECEIVED_DELETE', 'Message deletion received via broadcast', payload);
            
            const { messageId, userId } = payload.payload;
            
            // Only process if it's not from current user
            if (userId !== currentUser.id) {
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
          } catch (err) {
            debugLogger.info('PROCESS_DELETE_ERROR', 'Error processing message deletion', err);
          }
        }
      );

      // Listen for read status updates
      channelRef.current.on(
        'broadcast',
        { event: 'messages_read' },
        (payload: any) => {
          try {
            debugLogger.info('RECEIVED_READ', 'Read status received via broadcast', payload);
            
            const { conversationId: readConvId, userId } = payload.payload;
            
            // Only process if it's not from current user
            if (userId !== currentUser.id) {
              setMessages(prev => prev.map(msg => 
                msg.conversationId === readConvId && msg.senderId === currentUser.id
                  ? { ...msg, isRead: true }
                  : msg
              ));
            }
          } catch (err) {
            debugLogger.info('PROCESS_READ_ERROR', 'Error processing read status', err);
          }
        }
      );

      // Listen for typing indicators
      channelRef.current.on(
        'broadcast',
        { event: 'typing' },
        (payload: any) => {
          try {
            debugLogger.info('RECEIVED_TYPING', 'Typing indicator received', payload);
            
            const { userId, username, timestamp } = payload.payload;
            if (userId !== currentUser.id) {
              setTypingUsers(prev => {
                const filtered = prev.filter(user => user.userId !== userId);
                return [...filtered, { userId, username: username || 'Someone', timestamp: timestamp || Date.now() }];
              });
            }
          } catch (err) {
            debugLogger.info('PROCESS_TYPING_ERROR', 'Error processing typing indicator', err);
          }
        }
      );

      // Listen for stop typing
      channelRef.current.on(
        'broadcast',
        { event: 'stop_typing' },
        (payload: any) => {
          try {
            debugLogger.info('RECEIVED_STOP_TYPING', 'Stop typing received', payload);
            
            const { userId } = payload.payload;
            if (userId !== currentUser.id) {
              setTypingUsers(prev => prev.filter(user => user.userId !== userId));
            }
          } catch (err) {
            debugLogger.info('PROCESS_STOP_TYPING_ERROR', 'Error processing stop typing', err);
          }
        }
      );

      // Subscribe to the channel
      channelRef.current.subscribe((status: string) => {
        debugLogger.info('CHANNEL_STATUS', `Channel subscription status: ${status}`);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          debugLogger.info('CHANNEL_ERROR', `Channel failed: ${status}`);
          setError('Real-time connection failed. Messages may not update automatically.');
        } else if (status === 'SUBSCRIBED') {
          setError(null);
          debugLogger.info('CHANNEL_SUCCESS', 'Successfully connected to real-time messaging');
        }
      });

    } catch (error) {
      debugLogger.info('SETUP_BROADCAST_ERROR', 'Failed to set up broadcast channel', error);
      setError('Failed to set up real-time messaging. Some features may not work properly.');
    }

    // Initial network check
    checkNetworkStatus();

    // Set up periodic network checks (every 15 seconds to reduce load)
    connectionCheckRef.current = setInterval(checkNetworkStatus, 15000);

    // Load initial data
    loadConversations();
    if (conversationId) {
      loadMessages();
    }

    // Cleanup function
    return () => {
      debugLogger.info('CLEANUP_BROADCAST', 'Cleaning up broadcast channel');
      
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        
        if (connectionCheckRef.current) {
          clearInterval(connectionCheckRef.current);
          connectionCheckRef.current = null;
        }
        
        setIsConnected(false);
      } catch (err) {
        debugLogger.info('CLEANUP_ERROR', 'Error during cleanup', err);
      }
    };
  }, [currentUser?.id, conversationId, loadConversations, loadMessages, checkNetworkStatus, debugLogger]);

  // Update connection status based on network and Supabase connectivity
  useEffect(() => {
    const overallConnection = networkStatus && isConnected;
    debugLogger.info('BROADCAST', 'CONNECTION_STATUS', `Overall connection status: ${overallConnection}`, {
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
  };
};
