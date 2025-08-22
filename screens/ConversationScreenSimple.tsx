import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, MoreVertical, Phone, VideoIcon } from 'lucide-react-native';
import { Message, User } from '../types';
import { useUser } from '@/contexts/UserContext';
import { useMessaging } from '@/hooks/useMessagingBroadcast';
import { useDebugLogger } from '@/utils/debugLogger';

const { width, height } = Dimensions.get('window');

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onLongPress?: (message: Message) => void;
}

const MessageBubble = ({ message, isCurrentUser, onLongPress }: MessageBubbleProps) => {
  const [pressed, setPressed] = useState(false);

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(message);
    }
  };

  const handlePress = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
  };

  return (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      <TouchableOpacity
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          pressed && styles.messageBubblePressed
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserText : styles.otherUserText
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.messageTime,
          isCurrentUser ? styles.currentUserTime : styles.otherUserTime
        ]}>
          {message.timestamp ? 
            new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
            ''
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId, userId, userName } = useLocalSearchParams<{
    conversationId: string;
    userId: string;
    userName: string;
  }>();
  
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('ConversationScreen');
  
  const { 
    messages, 
    loading, 
    error, 
    sendMessage, 
    deleteMessage,
    markAsRead,
    loadMessages 
  } = useMessaging({ 
    conversationId, 
    autoMarkAsRead: true 
  });
  
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (conversationId) {
      debugLogger.log('LOAD_MESSAGES', `Loading messages for conversation: ${conversationId}`);
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages, debugLogger]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      debugLogger.log('SEND_MESSAGE', `Sending message: ${text.substring(0, 50)}...`);
      
      const message = await sendMessage(text);
      
      if (message) {
        debugLogger.log('SEND_SUCCESS', 'Message sent successfully');
        // Auto-scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        debugLogger.log('SEND_FAILED', 'Failed to send message');
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (err: any) {
      debugLogger.log('SEND_ERROR', 'Error sending message', err);
      Alert.alert('Error', `Failed to send message: ${err.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const handleMessageLongPress = (message: Message) => {
    if (message.senderId !== currentUser?.id) return;

    Alert.alert(
      'Message Options',
      'What would you like to do with this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteMessage(message)
        }
      ]
    );
  };

  const handleDeleteMessage = async (message: Message) => {
    try {
      debugLogger.log('DELETE_MESSAGE', `Deleting message: ${message.id}`);
      
      const success = await deleteMessage(message.id);
      
      if (success) {
        debugLogger.log('DELETE_SUCCESS', 'Message deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete message');
      }
    } catch (err: any) {
      debugLogger.log('DELETE_ERROR', 'Error deleting message', err);
      Alert.alert('Error', `Failed to delete message: ${err.message || 'Unknown error'}`);
    }
  };

  const handleBack = () => {
    debugLogger.log('NAVIGATE_BACK', 'Navigating back to messages');
    router.back();
  };

  const handleCall = () => {
    debugLogger.log('CALL_ATTEMPT', `Attempting to call user: ${userName}`);
    Alert.alert('Voice Call', 'Voice calling feature coming soon!');
  };

  const handleVideoCall = () => {
    debugLogger.log('VIDEO_CALL_ATTEMPT', `Attempting video call with user: ${userName}`);
    Alert.alert('Video Call', 'Video calling feature coming soon!');
  };

  const handleMore = () => {
    Alert.alert(
      'Conversation Options',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Chat', onPress: () => handleClearChat() },
        { text: 'Block User', style: 'destructive', onPress: () => handleBlockUser() }
      ]
    );
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            debugLogger.log('CLEAR_CHAT', `Clearing chat: ${conversationId}`);
            // Implementation for clearing chat
          }
        }
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? You won't receive messages from them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            debugLogger.log('BLOCK_USER', `Blocking user: ${userId}`);
            // Implementation for blocking user
          }
        }
      ]
    );
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Image
              source={{ 
                uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=faces'
              }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerText}>
              <Text style={styles.headerName} numberOfLines={1}>
                {userName || 'Chat'}
              </Text>
              <Text style={styles.headerStatus}>
                {loading ? 'Loading...' : 'Online'}
              </Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Phone size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleVideoCall}>
              <VideoIcon size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMore}>
              <MoreVertical size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {loading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isCurrentUser={message.senderId === currentUser?.id}
                onLongPress={handleMessageLongPress}
              />
            ))
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#666666"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
            >
              <Send size={20} color={(!messageText.trim() || sending) ? "#666666" : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#3A3A3A',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 12,
    color: '#00D2FF',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
  errorBanner: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
  },
  messageContainer: {
    paddingHorizontal: 15,
    marginVertical: 2,
  },
  currentUserContainer: {
    alignItems: 'flex-end',
  },
  otherUserContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageBubblePressed: {
    opacity: 0.7,
  },
  currentUserBubble: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 5,
  },
  otherUserBubble: {
    backgroundColor: '#3A3A3A',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#999999',
  },
  inputContainer: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#3A3A3A',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    paddingVertical: 10,
    paddingRight: 10,
  },
  sendButton: {
    backgroundColor: '#6C5CE7',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#3A3A3A',
  },
});
