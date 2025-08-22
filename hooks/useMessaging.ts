import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { dataService } from '@/services/dataService';
import { Message, Conversation } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { debug, useDebugLogger } from '@/utils/debugLogger';
import { notificationService, notificationHelpers } from '@/services/notificationService';

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
  const debugLogger = useDebugLogger('useMessaging');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  const messageChannelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      setError(null);
      debugLogger.process('MESSAGING', 'LOAD_CONVERSATIONS', 'Loading conversations');

      const conversations = await dataService.message.getConversations(currentUser.id);
      setConversations(conversations);
      
      debugLogger.success('MESSAGING', 'LOAD_CONVERSATIONS_SUCCESS', `Loaded ${conversations.length} conversations`);
    } catch (err) {
      const errorMessage = 'Failed to load conversations';
      setError(errorMessage);
      debugLogger.error('MESSAGING', 'LOAD_CONVERSATIONS_ERROR', errorMessage, err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, debugLogger]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    if (!currentUser?.id || !convId) return;

    try {
      setLoading(true);
      setError(null);
      debugLogger.process('MESSAGING', 'LOAD_MESSAGES', `Loading messages for conversation: ${convId}`);

      const messages = await dataService.message.getMessages(convId, currentUser.id);
      setMessages(messages);

      // Auto-mark as read if enabled
      if (autoMarkAsRead) {
        await dataService.message.markAsRead(convId, currentUser.id);
      }
      
      debugLogger.success('MESSAGING', 'LOAD_MESSAGES_SUCCESS', `Loaded ${messages.length} messages`);
    } catch (err) {
      const errorMessage = 'Failed to load messages';
      setError(errorMessage);
      debugLogger.error('MESSAGING', 'LOAD_MESSAGES_ERROR', errorMessage, err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, autoMarkAsRead, debugLogger]);

  // Send a message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', sharedPost?: any, sharedReel?: any) => {
    if (!currentUser?.id || !conversationId || !content.trim()) return null;

    try {
      debugLogger.process('MESSAGING', 'SEND_MESSAGE', `Sending message to conversation: ${conversationId}`);

      const message = await dataService.message.sendMessage(
        conversationId,
        currentUser.id,
        content.trim(),
        messageType,
        sharedPost,
        sharedReel
      );

      if (message) {
        // Add message to local state immediately for optimistic UI
        setMessages(prev => [...prev, message]);
        debugLogger.success('MESSAGING', 'SEND_MESSAGE_SUCCESS', 'Message sent successfully');
        
        // Update conversations list if it includes this conversation
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                lastMessage: message,
                updatedAt: message.createdAt || new Date().toISOString()
              }
            : conv
        ));

        // Send push notification to other participants
        try {
          const participants = await dataService.message.getConversationParticipants(conversationId);
          const otherParticipants = participants.filter(p => p.id !== currentUser.id);
          
          for (const participant of otherParticipants) {
            await notificationService.sendMessageNotification(
              participant.id,
              currentUser.username || 'Someone',
              content.trim(),
              conversationId,
              currentUser.id
            );
          }
          
          debugLogger.success('MESSAGING', 'NOTIFICATIONS_SENT', `Sent notifications to ${otherParticipants.length} participants`);
        } catch (notificationError) {
          debugLogger.error('MESSAGING', 'NOTIFICATION_ERROR', 'Failed to send notifications', notificationError);
          // Don't fail the message send if notifications fail
        }
      }

      return message;
    } catch (err) {
      const errorMessage = 'Failed to send message';
      setError(errorMessage);
      debugLogger.error('MESSAGING', 'SEND_MESSAGE_ERROR', errorMessage, err);
      return null;
    }
  }, [currentUser?.id, conversationId, debugLogger]);

  // Create a new conversation
  const createConversation = useCallback(async (participantIds: string[]) => {
    if (!currentUser?.id) return null;

    try {
      debugLogger.process('MESSAGING', 'CREATE_CONVERSATION', `Creating conversation with ${participantIds.length} participants`);

      const allParticipants = [currentUser.id, ...participantIds];
      const conversationId = await dataService.message.createConversation(allParticipants);

      if (conversationId) {
        debugLogger.success('MESSAGING', 'CREATE_CONVERSATION_SUCCESS', `Conversation created: ${conversationId}`);
        // Reload conversations to include the new one
        await loadConversations();
      }

      return conversationId;
    } catch (err) {
      const errorMessage = 'Failed to create conversation';
      setError(errorMessage);
      debugLogger.error('MESSAGING', 'CREATE_CONVERSATION_ERROR', errorMessage, err);
      return null;
    }
  }, [currentUser?.id, loadConversations, debugLogger]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id) return false;

    try {
      debugLogger.process('MESSAGING', 'DELETE_MESSAGE', `Deleting message: ${messageId}`);

      const success = await dataService.message.deleteMessage(messageId, currentUser.id);

      if (success) {
        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        debugLogger.success('MESSAGING', 'DELETE_MESSAGE_SUCCESS', 'Message deleted successfully');
      }

      return success;
    } catch (err) {
      const errorMessage = 'Failed to delete message';
      setError(errorMessage);
      debugLogger.error('MESSAGING', 'DELETE_MESSAGE_ERROR', errorMessage, err);
      return false;
    }
  }, [currentUser?.id, debugLogger]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (!currentUser?.id || !conversationId || !typingChannelRef.current) return;

    try {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUser.id,
          username: currentUser.username,
          conversationId,
          timestamp: Date.now(),
        },
      });

      debugLogger.info('MESSAGING', 'TYPING_SENT', 'Typing indicator sent');
    } catch (err) {
      debugLogger.error('MESSAGING', 'TYPING_ERROR', 'Failed to send typing indicator', err);
    }
  }, [currentUser, conversationId, debugLogger]);

  // Stop typing indicator
  const stopTypingIndicator = useCallback(() => {
    if (!currentUser?.id || !conversationId || !typingChannelRef.current) return;

    try {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: {
          userId: currentUser.id,
          conversationId,
          timestamp: Date.now(),
        },
      });

      debugLogger.info('MESSAGING', 'STOP_TYPING_SENT', 'Stop typing indicator sent');
    } catch (err) {
      debugLogger.error('MESSAGING', 'STOP_TYPING_ERROR', 'Failed to send stop typing indicator', err);
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
      }

      return success;
    } catch (err) {
      debugLogger.error('MESSAGING', 'MARK_READ_ERROR', 'Failed to mark messages as read', err);
      return false;
    }
  }, [currentUser?.id, debugLogger]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser?.id) return;

    debugLogger.info('MESSAGING', 'SETUP_REALTIME', 'Setting up real-time subscriptions');

    // Messages subscription
    messageChannelRef.current = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
        },
        (payload) => {
          debugLogger.info('MESSAGING', 'REALTIME_MESSAGE', 'New message received', { messageId: payload.new.id });
          
          const newMessage: Message = {
            id: payload.new.id,
            senderId: payload.new.sender_id,
            receiverId: currentUser.id,
            content: payload.new.content,
            timestamp: payload.new.created_at,
            conversationId: payload.new.conversation_id,
            isRead: payload.new.is_read,
            createdAt: payload.new.created_at,
          };

          // Only add if it's not from the current user (to avoid duplicates from optimistic updates)
          if (newMessage.senderId !== currentUser.id) {
            setMessages(prev => [...prev, newMessage]);
            
            // Update conversations list
            setConversations(prev => prev.map(conv => 
              conv.id === newMessage.conversationId
                ? { 
                    ...conv, 
                    lastMessage: newMessage,
                    unreadCount: conv.unreadCount + 1,
                    updatedAt: newMessage.createdAt || new Date().toISOString()
                  }
                : conv
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
        },
        (payload) => {
          debugLogger.info('MESSAGING', 'REALTIME_MESSAGE_UPDATE', 'Message updated', { messageId: payload.new.id });
          
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id
              ? { ...msg, isRead: payload.new.is_read }
              : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
        },
        (payload) => {
          debugLogger.info('MESSAGING', 'REALTIME_MESSAGE_DELETE', 'Message deleted', { messageId: payload.old.id });
          
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        debugLogger.info('MESSAGING', 'REALTIME_STATUS', `Message subscription status: ${status}`);
      });

    // Typing indicators subscription
    typingChannelRef.current = supabase
      .channel(`typing_${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, username, timestamp } = payload.payload;
        
        if (userId !== currentUser.id) {
          setTypingUsers(prev => {
            const filtered = prev.filter(user => user.userId !== userId);
            return [...filtered, { userId, username, timestamp }];
          });
          
          // Remove typing indicator after 5 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(user => 
              user.userId !== userId || Date.now() - user.timestamp > 5000
            ));
          }, 5000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        const { userId } = payload.payload;
        setTypingUsers(prev => prev.filter(user => user.userId !== userId));
      })
      .subscribe();

    return () => {
      debugLogger.info('MESSAGING', 'CLEANUP_REALTIME', 'Cleaning up real-time subscriptions');
      
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser?.id, conversationId, debugLogger]);

  // Load initial data
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations();
    }
  }, [currentUser?.id, loadConversations]);

  useEffect(() => {
    if (conversationId && currentUser?.id) {
      loadMessages(conversationId);
    }
  }, [conversationId, currentUser?.id, loadMessages]);

  return {
    // Data
    messages,
    conversations,
    typingUsers,
    
    // State
    loading,
    error,
    isConnected,
    
    // Actions
    sendMessage,
    createConversation,
    deleteMessage,
    markAsRead,
    loadConversations,
    loadMessages,
    handleTyping,
    sendTypingIndicator,
    stopTypingIndicator,
    
    // Utils
    clearError: () => setError(null),
  };
};