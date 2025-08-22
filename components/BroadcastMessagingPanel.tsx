import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Wifi, WifiOff, AlertCircle } from 'lucide-react-native';
import { useRealtimeBroadcast } from '@/hooks/useRealtimeBroadcast';
import { Message } from '@/types';
import { useUser } from '@/contexts/UserContext';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';

interface BroadcastMessagingPanelProps {
  conversationId: string;
  title?: string;
  onBack?: () => void;
}

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showSender?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, showSender }) => {
  return (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer
    ]}>
      {!isCurrentUser && showSender && (
        <Text style={styles.senderName}>{message.senderId}</Text>
      )}
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.sentMessageText : styles.receivedMessageText
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.messageTime,
          isCurrentUser ? styles.sentMessageTime : styles.receivedMessageTime
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {isCurrentUser && (
        <View style={styles.messageStatus}>
          {message.isRead ? (
            <Text style={styles.readIndicator}>✓✓</Text>
          ) : (
            <Text style={styles.sentIndicator}>✓</Text>
          )}
        </View>
      )}
    </View>
  );
};

interface TypingIndicatorProps {
  typingUsers: Array<{ userId: string; username: string; timestamp: number }>;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map(user => user.username).join(', ');
  const text = typingUsers.length === 1 ? `${names} is typing...` : `${names} are typing...`;

  return (
    <View style={styles.typingIndicator}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
      <Text style={styles.typingText}>{text}</Text>
    </View>
  );
};

interface ConnectionStatusProps {
  isConnected: boolean;
  networkStatus: boolean;
  error: string | null;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, networkStatus, error }) => {
  if (isConnected && networkStatus && !error) return null;

  return (
    <View style={[
      styles.connectionStatus,
      !networkStatus ? styles.disconnected : styles.connecting
    ]}>
      <View style={styles.statusContent}>
        {!networkStatus ? (
          <WifiOff size={16} color="#FF6B6B" />
        ) : (
          <Wifi size={16} color="#FFA726" />
        )}
        <Text style={[
          styles.statusText,
          !networkStatus ? styles.disconnectedText : styles.connectingText
        ]}>
          {!networkStatus ? 'No Internet' : error ? 'Connection Issues' : 'Connecting...'}
        </Text>
      </View>
      {error && (
        <TouchableOpacity style={styles.errorButton}>
          <AlertCircle size={14} color="#FF6B6B" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function BroadcastMessagingPanel({ 
  conversationId, 
  title = 'Chat',
  onBack 
}: BroadcastMessagingPanelProps) {
  const { user: currentUser } = useUser();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use our new broadcast hook
  const {
    messages,
    loading,
    error,
    isConnected,
    networkStatus,
    typingUsers,
    sendMessage,
    handleTyping,
    loadMessages,
  } = useRealtimeBroadcast({ 
    conversationId, 
    autoMarkAsRead: true 
  });

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !isConnected) return;

    const messageText = inputText.trim();
    setInputText('');
    
    try {
      await sendMessage(messageText);
      // Message will be added to local state optimistically by the hook
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(messageText); // Restore the message
    }
  }, [inputText, isConnected, sendMessage]);

  // Handle typing indicators
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      handleTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [isTyping, handleTyping]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Render message item
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === currentUser?.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showSender = !isCurrentUser && (!prevMessage || prevMessage.senderId !== item.senderId);

    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        showSender={showSender}
      />
    );
  }, [currentUser?.id, messages]);

  // Get item layout for performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 60, // Approximate message height
    offset: 60 * index,
    index,
  }), []);

  if (loading && messages.length === 0) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Header */}
        <LinearGradient
          colors={['#6C5CE7', '#5B4BD6']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerActions}>
              {isConnected ? (
                <View style={[styles.statusDot, styles.connected]} />
              ) : (
                <View style={[styles.statusDot, styles.disconnected]} />
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Connection Status */}
        <ConnectionStatus 
          isConnected={isConnected}
          networkStatus={networkStatus}
          error={error}
        />

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['rgba(108, 92, 231, 0.1)', 'rgba(91, 75, 214, 0.1)']}
            style={styles.inputBackground}
          >
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              multiline={true}
              maxLength={1000}
              editable={isConnected}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              style={[
                styles.sendButton,
                (!inputText.trim() || !isConnected) && styles.sendButtonDisabled
              ]}
              disabled={!inputText.trim() || !isConnected}
            >
              <LinearGradient
                colors={(!inputText.trim() || !isConnected) 
                  ? ['#9CA3AF', '#6B7280'] 
                  : ['#6C5CE7', '#5B4BD6']
                }
                style={styles.sendButtonGradient}
              >
                <Send size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#E0E0E0',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  connected: {
    backgroundColor: '#10B981',
  },
  disconnected: {
    backgroundColor: '#FF6B6B',
  },
  connectionStatus: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  connecting: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  connectingText: {
    color: '#FFA726',
  },
  disconnectedText: {
    color: '#FF6B6B',
  },
  errorButton: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  sentMessageContainer: {
    alignItems: 'flex-end',
  },
  receivedMessageContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    position: 'relative',
  },
  sentMessage: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 6,
  },
  receivedMessage: {
    backgroundColor: '#374151',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentMessageText: {
    color: '#FFFFFF',
  },
  receivedMessageText: {
    color: '#E0E0E0',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  sentMessageTime: {
    color: '#E8E3FF',
    textAlign: 'right',
  },
  receivedMessageTime: {
    color: '#9CA3AF',
  },
  messageStatus: {
    marginTop: 4,
    marginRight: 4,
  },
  readIndicator: {
    color: '#10B981',
    fontSize: 12,
  },
  sentIndicator: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C5CE7',
    marginHorizontal: 1,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  typingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2A2A2A',
  },
  inputBackground: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  textInput: {
    flex: 1,
    color: '#E0E0E0',
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'center',
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
