import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { dataService } from '@/services/dataService';
import { Message, Conversation } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { useDebugLogger } from '@/utils/debugLogger';
import NetInfo from '@react-native-community/netinfo';

interface UseRealtimeBroadcastProps {
  conversationId?: string;
  autoMarkAsRead?: boolean;
}

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

interface BroadcastMessage {
  type: 'broadcast';
  event: string;
  payload: any;
}

export const useRealtimeBroadcast = ({ 
  conversationId, 
  autoMarkAsRead = true 
}: UseRealtimeBroadcastProps = {}) => {
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('RealtimeBroadcast');
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  // Refs for cleanup
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations for current user
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) {
      debugLogger.info('CONVERSATIONS', 'SKIP_LOAD', 'No current user');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.info('CONVERSATIONS', 'LOAD_START', `Loading conversations for user: ${currentUser.id}`);

      const conversations = await dataService.message.getConversations(currentUser.id);
      setConversations(conversations);
      
      debugLogger.info('CONVERSATIONS', 'LOAD_SUCCESS', `Loaded ${conversations.length} conversations`);
    } catch (err: any) {
      const errorMessage = 'Failed to load conversations';
      setError(errorMessage);
      debugLogger.info('CONVERSATIONS', 'LOAD_ERROR', errorMessage, err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, debugLogger]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || conversationId;
    if (!currentUser?.id || !targetConversationId) {
      debugLogger.info('MESSAGES', 'SKIP_LOAD', 'Missing user ID or conversation ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.info('MESSAGES', 'LOAD_START', `Loading messages for conversation: ${targetConversationId}`);

      const messages = await dataService.message.getMessages(targetConversationId, currentUser.id);
      setMessages(messages);

      if (autoMarkAsRead) {
        await markAsRead(targetConversationId);
      }

      debugLogger.info('MESSAGES', 'LOAD_SUCCESS', `Loaded ${messages.length} messages`);
    } catch (err: any) {
      const errorMessage = 'Failed to load messages';
      setError(errorMessage);
      debugLogger.info('MESSAGES', 'LOAD_ERROR', errorMessage, err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, conversationId, autoMarkAsRead, debugLogger]);

  // Send message using broadcast (follows Supabase documentation pattern)
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!currentUser?.id || !conversationId || !content.trim()) {
      debugLogger.info('BROADCAST', 'SEND_SKIP', 'Missing required data for sending message');
      return null;
    }

    if (!networkStatus) {
      debugLogger.info('BROADCAST', 'SEND_SKIP', 'No network connection');
      setError('No network connection. Message will be sent when connection is restored.');
      return null;
    }

    try {
      debugLogger.info('BROADCAST', 'SEND_START', `Sending message to conversation: ${conversationId}`);

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
        debugLogger.info('BROADCAST', 'SEND_SUCCESS', 'Message saved to database');
        
        // Update conversations list locally
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                lastMessage: message,
                updatedAt: message.createdAt || new Date().toISOString()
              }
            : conv
        ));

        // Broadcast the message to other participants using WebSocket
        if (channelRef.current) {
          try {
            const broadcastResponse = await channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: {
                message,
                conversationId,
                senderId: currentUser.id,
                timestamp: Date.now()
              }
            });
            
            debugLogger.info('BROADCAST', 'SEND_BROADCAST_SUCCESS', 'Message broadcasted via WebSocket', broadcastResponse);
          } catch (broadcastError) {
            debugLogger.info('BROADCAST', 'SEND_BROADCAST_ERROR', 'Failed to broadcast message via WebSocket', broadcastError);
            // Don't fail the whole operation if broadcast fails
            setError('Message sent but real-time sync may be delayed');
          }
        } else {
          debugLogger.info('BROADCAST', 'SEND_NO_CHANNEL', 'No active channel for broadcasting');
        }

        setError(null);
      }

      return message;
    } catch (err: any) {
      const errorMessage = 'Failed to send message';
      setError(errorMessage);
      debugLogger.info('BROADCAST', 'SEND_ERROR', errorMessage, err);
      return null;
    }
  }, [currentUser?.id, conversationId, networkStatus, debugLogger]);

  // Create new conversation
  const createConversation = useCallback(async (participants: string[]) => {
    if (!currentUser?.id) {
      debugLogger.info('BROADCAST', 'CREATE_CONV_SKIP', 'No current user');
      return null;
    }

    try {
      debugLogger.info('BROADCAST', 'CREATE_CONV_START', `Creating conversation with ${participants.length} participants`);

      const conversationId = await dataService.message.createConversation([currentUser.id, ...participants]);
      
      if (conversationId) {
        debugLogger.info('BROADCAST', 'CREATE_CONV_SUCCESS', `Created conversation: ${conversationId}`);
        
        // Refresh conversations
        await loadConversations();
      }

      return conversationId;
    } catch (err: any) {
      const errorMessage = 'Failed to create conversation';
      setError(errorMessage);
      debugLogger.info('BROADCAST', 'CREATE_CONV_ERROR', errorMessage, err);
      return null;
    }
  }, [currentUser?.id, debugLogger, loadConversations]);

  // Delete message with broadcast
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id) {
      debugLogger.info('BROADCAST', 'DELETE_SKIP', 'No current user');
      return false;
    }

    try {
      debugLogger.info('BROADCAST', 'DELETE_START', `Deleting message: ${messageId}`);

      const success = await dataService.message.deleteMessage(messageId, currentUser.id);
      
      if (success) {
        // Remove from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        debugLogger.info('BROADCAST', 'DELETE_SUCCESS', 'Message deleted from database');

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
            debugLogger.info('BROADCAST', 'DELETE_BROADCAST_SUCCESS', 'Message deletion broadcasted');
          } catch (broadcastError) {
            debugLogger.info('BROADCAST', 'DELETE_BROADCAST_ERROR', 'Failed to broadcast deletion', broadcastError);
          }
        }
      }

      return success;
    } catch (err: any) {
      const errorMessage = 'Failed to delete message';
      setError(errorMessage);
      debugLogger.info('BROADCAST', 'DELETE_ERROR', errorMessage, err);
      return false;
    }
  }, [currentUser?.id, conversationId, debugLogger]);

  // Mark messages as read with broadcast
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
            debugLogger.info('BROADCAST', 'READ_BROADCAST_SUCCESS', 'Read status broadcasted');
          } catch (broadcastError) {
            debugLogger.info('BROADCAST', 'READ_BROADCAST_ERROR', 'Failed to broadcast read status', broadcastError);
          }
        }
      }

      return success;
    } catch (err: any) {
      debugLogger.info('BROADCAST', 'READ_ERROR', 'Failed to mark messages as read', err);
      return false;
    }
  }, [currentUser?.id, debugLogger]);

  // Send typing indicator using broadcast
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

      debugLogger.info('BROADCAST', 'TYPING_SENT', 'Typing indicator sent');
    } catch (err) {
      debugLogger.info('BROADCAST', 'TYPING_ERROR', 'Failed to send typing indicator', err);
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

      debugLogger.info('BROADCAST', 'STOP_TYPING_SENT', 'Stop typing indicator sent');
    } catch (err) {
      debugLogger.info('BROADCAST', 'STOP_TYPING_ERROR', 'Failed to send stop typing indicator', err);
    }
  }, [currentUser, conversationId, debugLogger]);

  // Handle typing with automatic stop (3 seconds)
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
      const isNetworkConnected = netInfo.isConnected && netInfo.isInternetReachable;
      setNetworkStatus(isNetworkConnected || false);
      
      if (isNetworkConnected) {
        // Test Supabase connection
        try {
          const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
          
          if (error) {
            debugLogger.info('BROADCAST', 'DB_TEST_FAILED', 'Database connection test failed', error);
            setIsConnected(false);
            setError(`Database connection failed: ${error.message}`);
          } else {
            debugLogger.info('BROADCAST', 'DB_TEST_SUCCESS', 'Database connection test successful');
            setIsConnected(true);
            setError(null);
          }
        } catch (dbError: any) {
          debugLogger.info('BROADCAST', 'DB_TEST_ERROR', 'Database connection error', dbError);
          setIsConnected(false);
          setError(`Database connection error: ${dbError.message}`);
        }
      } else {
        setIsConnected(false);
        setError('No internet connection');
      }
    } catch (error) {
      debugLogger.info('BROADCAST', 'NETWORK_CHECK_ERROR', 'Network status check failed', error);
      setNetworkStatus(false);
      setIsConnected(false);
    }
  }, [debugLogger]);

  // Setup Supabase Broadcast channel (follows official documentation)
  useEffect(() => {
    if (!currentUser?.id) return;

    debugLogger.info('BROADCAST', 'SETUP_START', 'Setting up Supabase Broadcast channel');

    try {
      // Create channel with unique name based on conversation or user
      const channelName = conversationId ? `conversation-${conversationId}` : `user-${currentUser.id}`;
      
      // Initialize channel with broadcast configuration (following Supabase docs)
      channelRef.current = supabase.channel(channelName, {
        config: {
          broadcast: { 
            self: false,  // Don't receive our own messages
            ack: true     // Acknowledge receipt (recommended for reliable delivery)
          },
        },
      });

      // Message received handler (broadcast event: new_message)
      function messageReceived(payload: any) {
        try {
          debugLogger.info('BROADCAST', 'MESSAGE_RECEIVED', 'New message received via broadcast', payload);
          
          const { message, senderId } = payload;
          
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
          debugLogger.info('BROADCAST', 'MESSAGE_PROCESS_ERROR', 'Error processing received message', err);
        }
      }

      // Subscribe to broadcast events (following Supabase docs pattern)
      channelRef.current
        .on('broadcast', { event: 'new_message' }, messageReceived)
        .on('broadcast', { event: 'message_deleted' }, (payload: any) => {
          try {
            debugLogger.info('BROADCAST', 'DELETE_RECEIVED', 'Message deletion received', payload);
            
            const { messageId, userId } = payload;
            
            // Only process if it's not from current user
            if (userId !== currentUser.id) {
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
          } catch (err) {
            debugLogger.info('BROADCAST', 'DELETE_PROCESS_ERROR', 'Error processing message deletion', err);
          }
        })
        .on('broadcast', { event: 'messages_read' }, (payload: any) => {
          try {
            debugLogger.info('BROADCAST', 'READ_RECEIVED', 'Read status received', payload);
            
            const { conversationId: readConvId, userId } = payload;
            
            // Only process if it's not from current user
            if (userId !== currentUser.id) {
              setMessages(prev => prev.map(msg => 
                msg.conversationId === readConvId && msg.senderId === currentUser.id
                  ? { ...msg, isRead: true }
                  : msg
              ));
            }
          } catch (err) {
            debugLogger.info('BROADCAST', 'READ_PROCESS_ERROR', 'Error processing read status', err);
          }
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          try {
            debugLogger.info('BROADCAST', 'TYPING_RECEIVED', 'Typing indicator received', payload);
            
            const { userId, username, timestamp } = payload;
            if (userId !== currentUser.id) {
              setTypingUsers(prev => {
                const filtered = prev.filter(user => user.userId !== userId);
                return [...filtered, { userId, username: username || 'Someone', timestamp: timestamp || Date.now() }];
              });
            }
          } catch (err) {
            debugLogger.info('BROADCAST', 'TYPING_PROCESS_ERROR', 'Error processing typing indicator', err);
          }
        })
        .on('broadcast', { event: 'stop_typing' }, (payload: any) => {
          try {
            debugLogger.info('BROADCAST', 'STOP_TYPING_RECEIVED', 'Stop typing received', payload);
            
            const { userId } = payload;
            if (userId !== currentUser.id) {
              setTypingUsers(prev => prev.filter(user => user.userId !== userId));
            }
          } catch (err) {
            debugLogger.info('BROADCAST', 'STOP_TYPING_PROCESS_ERROR', 'Error processing stop typing', err);
          }
        })
        .subscribe((status: string) => {
          debugLogger.info('BROADCAST', 'SUBSCRIPTION_STATUS', `Channel subscription status: ${status}`);
          setIsConnected(status === 'SUBSCRIBED');
          
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            debugLogger.info('BROADCAST', 'SUBSCRIPTION_ERROR', `Channel failed: ${status}`);
            setError('Real-time connection failed. Messages may not update automatically.');
          } else if (status === 'SUBSCRIBED') {
            setError(null);
            debugLogger.info('BROADCAST', 'SUBSCRIPTION_SUCCESS', 'Successfully connected to real-time messaging');
          }
        });

    } catch (error) {
      debugLogger.info('BROADCAST', 'SETUP_ERROR', 'Failed to set up broadcast channel', error);
      setError('Failed to set up real-time messaging. Some features may not work properly.');
    }

    // Initial data load and network check
    checkNetworkStatus();
    connectionCheckRef.current = setInterval(checkNetworkStatus, 15000); // Check every 15 seconds
    
    loadConversations();
    if (conversationId) {
      loadMessages();
    }

    // Cleanup function
    return () => {
      debugLogger.info('BROADCAST', 'CLEANUP_START', 'Cleaning up broadcast channel');
      
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
        debugLogger.info('BROADCAST', 'CLEANUP_ERROR', 'Error during cleanup', err);
      }
    };
  }, [currentUser?.id, conversationId, loadConversations, loadMessages, checkNetworkStatus, debugLogger]);

  // Auto-cleanup typing users after 5 seconds of inactivity
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(user => now - user.timestamp < 5000));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

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
    
    // Status
    networkStatus,
    supabaseConnected: isConnected,
  };
};
