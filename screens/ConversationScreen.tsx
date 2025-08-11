import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Send, MoreVertical, Phone, VideoIcon, Trash2, Heart, Reply, Paperclip } from 'lucide-react-native';
import { Message, User } from '../types';
import { useUser } from '@/contexts/UserContext';
import { useMessaging } from '@/hooks/useMessagingSimple';
import { debug, useDebugLogger } from '@/utils/debugLogger';
import { dataService } from '@/services/dataService';
import MediaMessageInput from '@/components/MediaMessageInput';
import MediaMessageBubble from '@/components/MediaMessageBubble';

const { width, height } = Dimensions.get('window');
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ConversationScreenProps {
  route?: {
    params?: {
      conversationId?: string;
      userId?: string;
      userName?: string;
    };
  };
}

export default function ConversationScreen({ route }: ConversationScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId: string; userId: string; userName: string }>();
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('ConversationScreen');
  
  const conversationId = route?.params?.conversationId || params?.conversationId;
  const otherUserId = route?.params?.userId || params?.userId;
  const otherUserName = route?.params?.userName || params?.userName;

  const {
    messages,
    loading,
    error,
    isConnected,
    sendMessage,
    deleteMessage,
    markAsRead,
    handleTyping,
    typingUsers,
    clearError,
  } = useMessaging({ 
    conversationId: conversationId || '', 
    autoMarkAsRead: true 
  });

  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const sendButtonScale = useSharedValue(1);
  const inputScale = useSharedValue(1);

  // Load other user's profile
  useEffect(() => {
    const loadOtherUser = async () => {
      if (!otherUserId) return;
      
      try {
        setLoadingUser(true);
        const userProfile = await dataService.user.getUserProfile(otherUserId);
        if (userProfile) {
          setOtherUser(userProfile);
          debugLogger.success('CONVERSATION', 'USER_LOADED', `Loaded user profile: ${userProfile.username}`);
        }
      } catch (err) {
        debugLogger.error('CONVERSATION', 'USER_LOAD_ERROR', 'Failed to load user profile', err);
      } finally {
        setLoadingUser(false);
      }
    };

    loadOtherUser();
  }, [otherUserId, debugLogger]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle message input changes with typing indicator
  const handleMessageChange = (text: string) => {
    setNewMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      handleTyping();
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      sendButtonScale.value = withSpring(0.8, {}, () => {
        sendButtonScale.value = withSpring(1);
      });
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const message = await sendMessage(newMessage.trim());
      
      if (message) {
      setNewMessage('');
        setIsTyping(false);
        inputRef.current?.blur();
        
        // Scroll to bottom after sending
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        debugLogger.success('CONVERSATION', 'MESSAGE_SENT', 'Message sent successfully');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (err) {
      debugLogger.error('CONVERSATION', 'SEND_ERROR', 'Failed to send message', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteMessage(messageId);
              if (success) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                debugLogger.success('CONVERSATION', 'MESSAGE_DELETED', 'Message deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete message');
              }
            },
          },
        ]
      );
    } catch (err) {
      debugLogger.error('CONVERSATION', 'DELETE_ERROR', 'Failed to delete message', err);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleSendMedia = async (mediaUrl: string, mediaType: string, caption?: string) => {
    if (!conversationId) return;

    try {
      debugLogger.process('CONVERSATION', 'SEND_MEDIA', `Sending ${mediaType} message`);
      
      const message = await sendMessage(caption || `Sent a ${mediaType}`, mediaType);
      
      if (message) {
        debugLogger.success('CONVERSATION', 'MEDIA_SENT', `${mediaType} message sent successfully`);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to send media. Please try again.');
      }
    } catch (err) {
      debugLogger.error('CONVERSATION', 'SEND_MEDIA_ERROR', 'Failed to send media message', err);
      Alert.alert('Error', 'Failed to send media. Please try again.');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const messageTime = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return messageTime.toLocaleDateString();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === currentUser?.id;
    const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.senderId !== item.senderId;
    
    // Check if this is a media message (for now, we'll detect based on content or add a messageType field)
    const isMediaMessage = item.content.includes('Sent a image') || 
                          item.content.includes('Sent a video') || 
                          item.content.includes('Sent a document');
    
    const getMediaType = (): 'image' | 'video' | 'document' => {
      if (item.content.includes('image')) return 'image';
      if (item.content.includes('video')) return 'video';
      return 'document';
    };
    
    return (
    <View style={[
      styles.messageContainer,
        isCurrentUser ? styles.userMessage : styles.otherMessage
      ]}>
        {!isCurrentUser && isLastInGroup && otherUser && (
          <Image 
            source={{ uri: otherUser.avatar || otherUser.profilePicture || 'https://via.placeholder.com/40' }}
            style={styles.messageAvatar}
          />
        )}
        
        {isMediaMessage ? (
          <View style={styles.mediaMessageContainer}>
            <MediaMessageBubble
              mediaUrl="https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg" // This should come from the message data
              mediaType={getMediaType()}
              fileName={`media_${item.id}`}
              isCurrentUser={isCurrentUser}
              timestamp={item.timestamp}
            />
            
            {isCurrentUser && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteMessage(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={14} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={[
              styles.messageBubble,
              isCurrentUser ? styles.userBubble : styles.otherBubble,
              { marginLeft: !isCurrentUser && !isLastInGroup ? 48 : 0 }
    ]}>
      <Text style={[
        styles.messageText,
                isCurrentUser ? styles.userMessageText : styles.otherMessageText
      ]}>
                {item.content}
      </Text>
              
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.timestamp,
                  isCurrentUser ? styles.userTimestamp : styles.otherTimestamp
                ]}>
                  {formatTimestamp(item.timestamp)}
      </Text>
                
                {isCurrentUser && (
                  <View style={styles.messageStatus}>
                    {item.isRead ? (
                      <View style={styles.readStatus}>
                        <Text style={styles.readText}>✓✓</Text>
                      </View>
                    ) : (
                      <View style={styles.sentStatus}>
                        <Text style={styles.sentText}>✓</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
            
            {isCurrentUser && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteMessage(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={14} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </>
        )}
    </View>
  );
  };

  // Animated styles
  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  // Loading state
  if (loadingUser) {
    return (
      <LinearGradient colors={['#1E1E1E', '#2A2A2A', '#1E1E1E']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#2A2A2A', '#1E1E1E']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        
        {/* Header */}
        <BlurView intensity={50} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              {otherUser && (
                <Image 
                  source={{ uri: otherUser.avatar || otherUser.profilePicture || 'https://via.placeholder.com/40' }}
                  style={styles.headerAvatar}
                />
              )}
              <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
                  {otherUser?.username || otherUserName || 'Unknown User'}
          </Text>
                <View style={styles.statusContainer}>
                  {!isConnected && (
                    <Text style={styles.offlineStatus}>Offline</Text>
                  )}
                  {typingUsers.length > 0 && (
                    <Text style={styles.typingStatus}>typing...</Text>
                  )}
                  {isConnected && typingUsers.length === 0 && otherUser?.isOnline && (
                    <Text style={styles.onlineStatus}>online</Text>
                  )}
                </View>
              </View>
        </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Phone size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <VideoIcon size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <MoreVertical size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingMessages}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            }
          />
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>
                {typingUsers.map(user => user.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </Text>
            </View>
          </View>
        )}

        {/* Input Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <BlurView intensity={30} style={styles.inputBlur}>
            <View style={styles.inputRow}>
              <TouchableOpacity 
                style={styles.mediaButton}
                onPress={() => setShowMediaInput(true)}
              >
                <Paperclip size={20} color="#6C5CE7" />
              </TouchableOpacity>
              
              <Animated.View style={[styles.textInputContainer, inputAnimatedStyle]}>
            <TextInput
                  ref={inputRef}
              style={styles.textInput}
              value={newMessage}
                  onChangeText={handleMessageChange}
              placeholder="Type a message..."
                  placeholderTextColor="#999"
              multiline
                  maxLength={1000}
                  onFocus={() => {
                    inputScale.value = withSpring(1.02);
                  }}
                  onBlur={() => {
                    inputScale.value = withSpring(1);
                  }}
                />
              </Animated.View>
              
              <AnimatedTouchableOpacity
                style={[styles.sendButton, sendButtonAnimatedStyle]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || loading}
            >
              <LinearGradient
                  colors={newMessage.trim() ? ['#6C5CE7', '#5A4FCF'] : ['#555', '#444']}
                style={styles.sendButtonGradient}
              >
                  <Send size={20} color="#FFFFFF" />
              </LinearGradient>
              </AnimatedTouchableOpacity>
          </View>
          </BlurView>
        </KeyboardAvoidingView>
        
        {/* Media Message Input Modal */}
        <MediaMessageInput
          visible={showMediaInput}
          onClose={() => setShowMediaInput(false)}
          onSendMedia={handleSendMedia}
          currentUserId={currentUser?.id || ''}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineStatus: {
    fontSize: 12,
    color: '#00D46A',
  },
  offlineStatus: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  typingStatus: {
    fontSize: 12,
    color: '#6C5CE7',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    flex: 1,
  },
  dismissText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  loadingMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#6C5CE7',
    marginLeft: 48,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 48,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#999',
  },
  messageStatus: {
    marginLeft: 8,
  },
  readStatus: {},
  readText: {
    fontSize: 11,
    color: '#00D46A',
  },
  sentStatus: {},
  sentText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingText: {
    color: '#6C5CE7',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
  },
  inputBlur: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  mediaMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});