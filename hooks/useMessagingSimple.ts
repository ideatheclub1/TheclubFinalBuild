import { useState, useEffect, useCallback, useRef } from 'react';
import { dataService } from '@/services/dataService';
import { Message, Conversation } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { useDebugLogger } from '@/utils/debugLogger';

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
  const [isConnected, setIsConnected] = useState(true); // Always true for simplified version
  const [typingUsers, setTypingUsers] = useState<any[]>([]); // Simplified typing

  // Polling interval for updates (fallback for real-time)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) {
      debugLogger.log('MESSAGING', 'LOAD_CONVERSATIONS_SKIP', 'No current user');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.log('MESSAGING', 'LOAD_CONVERSATIONS_START', `Loading conversations for user: ${currentUser.id}`);

      const conversations = await dataService.message.getConversations(currentUser.id);
      setConversations(conversations);
      
      debugLogger.log('MESSAGING', 'LOAD_CONVERSATIONS_SUCCESS', `Loaded ${conversations.length} conversations`);
    } catch (err: any) {
      const errorMessage = 'Failed to load conversations';
      setError(errorMessage);
      debugLogger.log('MESSAGING', 'LOAD_CONVERSATIONS_ERROR', errorMessage, err);
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, debugLogger]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || conversationId;
    if (!currentUser?.id || !targetConversationId) {
      debugLogger.log('MESSAGING', 'LOAD_MESSAGES_SKIP', 'Missing user ID or conversation ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLogger.log('MESSAGING', 'LOAD_MESSAGES_START', `Loading messages for conversation: ${targetConversationId}`);

      const messages = await dataService.message.getMessages(targetConversationId, currentUser.id);
      setMessages(messages);

      if (autoMarkAsRead) {
        await dataService.message.markAsRead(targetConversationId, currentUser.id);
      }

      debugLogger.log('MESSAGING', 'LOAD_MESSAGES_SUCCESS', `Loaded ${messages.length} messages`);
    } catch (err: any) {
      const errorMessage = 'Failed to load messages';
      setError(errorMessage);
      debugLogger.log('MESSAGING', 'LOAD_MESSAGES_ERROR', errorMessage, err);
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, conversationId, autoMarkAsRead, debugLogger]);

  // Send a message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!currentUser?.id || !conversationId || !content.trim()) {
      debugLogger.log('MESSAGING', 'SEND_MESSAGE_SKIP', 'Missing required data for sending message');
      return null;
    }

    try {
      debugLogger.log('MESSAGING', 'SEND_MESSAGE_START', `Sending message to conversation: ${conversationId}`);

      const message = await dataService.message.sendMessage(
        conversationId,
        currentUser.id,
        content.trim(),
        messageType
      );

      if (message) {
        // Add message to local state immediately for optimistic UI
        setMessages(prev => [...prev, message]);
        debugLogger.log('MESSAGING', 'SEND_MESSAGE_SUCCESS', 'Message sent successfully');
        
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

        // Refresh conversations after a short delay
        setTimeout(() => {
          loadConversations();
        }, 500);
      }

      return message;
    } catch (err: any) {
      const errorMessage = 'Failed to send message';
      setError(errorMessage);
      debugLogger.log('MESSAGING', 'SEND_MESSAGE_ERROR', errorMessage, err);
      console.error('Send message error:', err);
      return null;
    }
  }, [currentUser?.id, conversationId, debugLogger, loadConversations]);

  // Create conversation
  const createConversation = useCallback(async (participants: string[]) => {
    if (!currentUser?.id) {
      debugLogger.log('MESSAGING', 'CREATE_CONVERSATION_SKIP', 'No current user');
      return null;
    }

    try {
      debugLogger.log('MESSAGING', 'CREATE_CONVERSATION_START', `Creating conversation with ${participants.length} participants`);

      const conversationId = await dataService.message.createConversation([currentUser.id, ...participants]);
      
      if (conversationId) {
        debugLogger.log('MESSAGING', 'CREATE_CONVERSATION_SUCCESS', `Created conversation: ${conversationId}`);
        
        // Refresh conversations
        await loadConversations();
      }

      return conversationId;
    } catch (err: any) {
      const errorMessage = 'Failed to create conversation';
      setError(errorMessage);
      debugLogger.log('MESSAGING', 'CREATE_CONVERSATION_ERROR', errorMessage, err);
      console.error('Create conversation error:', err);
      return null;
    }
  }, [currentUser?.id, debugLogger, loadConversations]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id) {
      debugLogger.log('MESSAGING', 'DELETE_MESSAGE_SKIP', 'No current user');
      return false;
    }

    try {
      debugLogger.log('MESSAGING', 'DELETE_MESSAGE_START', `Deleting message: ${messageId}`);

      const success = await dataService.message.deleteMessage(messageId, currentUser.id);
      
      if (success) {
        // Remove from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        debugLogger.log('MESSAGING', 'DELETE_MESSAGE_SUCCESS', 'Message deleted successfully');
      }

      return success;
    } catch (err: any) {
      const errorMessage = 'Failed to delete message';
      setError(errorMessage);
      debugLogger.log('MESSAGING', 'DELETE_MESSAGE_ERROR', errorMessage, err);
      console.error('Delete message error:', err);
      return false;
    }
  }, [currentUser?.id, debugLogger]);

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
    } catch (err: any) {
      debugLogger.log('MESSAGING', 'MARK_READ_ERROR', 'Failed to mark messages as read', err);
      return false;
    }
  }, [currentUser?.id, debugLogger]);

  // Simplified typing functions (no real-time for now)
  const sendTypingIndicator = useCallback(() => {
    debugLogger.log('MESSAGING', 'TYPING_INDICATOR', 'Typing indicator (simplified)');
  }, [debugLogger]);

  const stopTypingIndicator = useCallback(() => {
    debugLogger.log('MESSAGING', 'STOP_TYPING_INDICATOR', 'Stop typing indicator (simplified)');
  }, [debugLogger]);

  const handleTyping = useCallback(() => {
    sendTypingIndicator();
  }, [sendTypingIndicator]);

  // Initialize and setup polling for updates
  useEffect(() => {
    if (!currentUser?.id) return;

    debugLogger.log('MESSAGING', 'INITIALIZE', 'Initializing messaging hook');

    // Load initial data
    loadConversations();
    
    if (conversationId) {
      loadMessages();
    }

    // Set up polling for conversations (every 30 seconds)
    pollingRef.current = setInterval(() => {
      if (currentUser?.id) {
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
      debugLogger.log('MESSAGING', 'CLEANUP', 'Cleaning up messaging hook');
    };
  }, [currentUser?.id, conversationId, loadConversations, loadMessages, debugLogger]);

  return {
    // State
    messages,
    conversations,
    loading,
    error,
    isConnected,
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
  };
};

