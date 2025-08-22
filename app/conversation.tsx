import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Clipboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CachedImage from '../components/CachedImage';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import { 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  Plus, 
  Search,
  MoreVertical,
  Clock,
  User,
  X
} from 'lucide-react-native';
import MediaMessageInput from '@/components/MediaMessageInput';
import MediaMessageBubble from '@/components/MediaMessageBubble';
import ImageViewerModal from '@/components/ImageViewerModal';
import MessageOptionsModal from '@/components/MessageOptionsModal';
import EditMessageModal from '@/components/EditMessageModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useUser } from '@/contexts/UserContext';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { useMessaging } from '@/hooks/useMessaging';
import { dataService } from '@/services/dataService';
import { Conversation, Message, User as UserType, Post, Reel } from '@/types';
import { debug, useDebugLogger } from '@/utils/debugLogger';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  otherUser?: UserType;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, otherUser }) => {
  const bubbleScale = useSharedValue(0.8);
  
  useEffect(() => {
    bubbleScale.value = withSpring(1, { damping: 12 });
  }, []);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));

  return (
    <Animated.View 
      style={[
        styles.messageBubble,
        isOwn ? styles.ownMessage : styles.otherMessage,
        bubbleStyle
      ]}
      entering={SlideInRight.delay(100)}
    >
      {!isOwn && otherUser && (
        <View style={styles.messageHeader}>
          <CachedImage 
            source={{ uri: otherUser.avatar }} 
            style={styles.messageAvatar} 
            cacheType="thumbnail"
          />
          <Text style={styles.messageSender}>{otherUser.username}</Text>
        </View>
      )}
      <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
        {message.content}
      </Text>
      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </Animated.View>
  );
};

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    conversationId?: string; 
    userId?: string; 
    userName?: string;
    mode?: 'list' | 'chat';
    createWithUserId?: string;
  }>();
  
  const { user: currentUser } = useUser();
  const { isUserOnline, getUserPresence, onlineUsers: presenceOnlineUsers } = usePresenceContext();
  const debugLogger = useDebugLogger('ConversationScreen');
  
  // State management
  const [mode, setMode] = useState<'list' | 'chat'>(params.mode || 'list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    params.conversationId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentReels, setRecentReels] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserType[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUri, setImageViewerUri] = useState('');
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editMessageVisible, setEditMessageVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  // Animation values
  const headerOpacity = useSharedValue(1);
  const inputScale = useSharedValue(1);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      debugLogger.info('LOAD_CONVERSATIONS', 'Loading conversations list');
      
      const conversations = await dataService.message.getConversations(currentUser.id);
      setConversations(conversations);
      
      debugLogger.success('LOAD_CONVERSATIONS', `Loaded ${conversations.length} conversations`, {
        conversations: conversations.map(c => ({
          id: c.id,
          participantCount: c.participants?.length || 0,
          participants: c.participants?.map(p => ({ id: p.id, username: p.username, fullName: p.fullName })) || [],
          lastMessage: c.lastMessage?.content || 'No message',
          updatedAt: c.updatedAt
        }))
      });
    } catch (err) {
      debugLogger.error('LOAD_CONVERSATIONS', 'Failed to load conversations', err);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Load conversations on mount
  // CONSOLIDATED useEffect to prevent multiple calls to loadConversations
  useEffect(() => {
    debugLogger.info('CONVERSATION_SCREEN', 'MOUNT_CHECK', `Checking if should load conversations - User: ${currentUser?.id}, Mode: ${mode}`);
    
    if (currentUser?.id && mode === 'list') {
      debugLogger.info('CONVERSATION_SCREEN', 'MOUNT', 'Loading conversations on screen mount');
      loadConversations();
    } else {
      const reason = !currentUser?.id ? 'No current user' : 'Mode is not list';
      debugLogger.warn('CONVERSATION_SCREEN', 'MOUNT_SKIP', `Skipping conversation load: ${reason}`);
    }
  }, [currentUser?.id, mode]); // Only load when user or mode changes

  // Load messages for a specific conversation
  const loadMessages = async (conversationId: string) => {
    console.error('🚨🚨🚨 LOADMESSAGES_START - Function called!', { conversationId, userId: currentUser?.id });
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      debugLogger.info('LOAD_MESSAGES', `Loading messages for conversation: ${conversationId}`);
      
      // Get conversation details and participants
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        const otherParticipant = conversation.participants.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
          setOtherUser(otherParticipant);
          debugLogger.info('LOAD_MESSAGES', `Set other user: ${otherParticipant.username}`, { userId: otherParticipant.id });
        }
      } else {
        // If conversation not found in local list, try to get participants from database
        debugLogger.info('LOAD_MESSAGES', 'Conversation not in local list, fetching participants');
        try {
          const participants = await dataService.message.getConversationParticipants(conversationId);
          const otherParticipant = participants.find(p => p.id !== currentUser.id);
          if (otherParticipant) {
            setOtherUser(otherParticipant);
            debugLogger.info('LOAD_MESSAGES', `Set other user from database: ${otherParticipant.username}`, { userId: otherParticipant.id });
          }
        } catch (participantError) {
          debugLogger.warn('LOAD_MESSAGES', 'Failed to fetch participants', participantError);
        }
      }
      
      // Load messages
      console.error('🚨🚨🚨 CONVERSATION_SCREEN - About to call getMessages for conversation:', conversationId);
      const messages = await dataService.message.getMessages(conversationId, currentUser.id);
      console.error('🚨🚨🚨 CONVERSATION_SCREEN - Received messages count:', messages.length);
      console.error('🚨🚨🚨 CONVERSATION_SCREEN - Sample message:', messages.length > 0 ? JSON.stringify(messages[0], null, 2) : 'NO MESSAGES');
      setMessages(messages);
      setSelectedConversation(conversationId);
      setMode('chat');
      
      // Mark messages as read
      await dataService.message.markMessagesAsRead(conversationId, currentUser.id);
      
      // Refresh conversations to update unread count
      loadConversations();
      
      debugLogger.success('LOAD_MESSAGES', `Loaded ${messages.length} messages`);
    } catch (err) {
      debugLogger.error('LOAD_MESSAGES', 'Failed to load messages', err);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser?.id) return;
    
    try {
      debugLogger.info('SEND_MESSAGE', 'Attempting to send message', { 
        conversationId: selectedConversation,
        senderId: currentUser.id,
        contentLength: newMessage.trim().length
      });
      
      const message = await dataService.message.sendMessage(
        selectedConversation,
        currentUser.id,
        newMessage.trim(),
        'text'
      );
      
      if (message) {
        // Add message to local state immediately for optimistic UI
        // Since FlatList is inverted, add new messages to the beginning of the array
        setMessages(prev => [message, ...prev]);
        setNewMessage('');
        debugLogger.success('SEND_MESSAGE', 'Message sent successfully', { messageId: message.id });
      } else {
        throw new Error('Failed to send message - no message returned');
      }
    } catch (err) {
      debugLogger.error('SEND_MESSAGE', 'Failed to send message', err);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Load recent posts and reels for sharing
  const loadRecentContent = useCallback(async () => {
    try {
      // For now, use mock data since we need to implement proper data service methods
      setRecentPosts([]);
      setRecentReels([]);
    } catch (error) {
      debugLogger.error('LOAD_CONTENT', 'Failed to load recent content', error);
    }
  }, [currentUser?.id]);

  // Load online users from presence context and user profiles
  const loadOnlineUsers = useCallback(async () => {
    try {
      // debugLogger.info('LOAD_ONLINE_USERS', 'Loading online users from presence context');
      
      // Convert presence data to user objects
      const onlineUsersList: UserType[] = [];
      
      for (const [userId, presenceUser] of presenceOnlineUsers) {
        if (presenceUser.isOnline && userId !== currentUser?.id) {
          try {
            // Try to get full user profile
            const userProfile = await dataService.user.getUserProfile(userId);
            if (userProfile) {
              onlineUsersList.push({
                ...userProfile,
                isOnline: true,
                lastSeen: presenceUser.lastSeen
              });
            } else {
              // Fallback to presence data
              onlineUsersList.push({
                id: userId,
                username: presenceUser.username || 'Unknown',
                avatar: '',
                isOnline: true,
                lastSeen: presenceUser.lastSeen
              });
            }
          } catch (error) {
            // debugLogger.warn('LOAD_ONLINE_USERS', `Failed to load profile for user ${userId}`, error);
            // Still add user with basic info
            onlineUsersList.push({
              id: userId,
              username: presenceUser.username || 'Unknown',
              avatar: '',
              isOnline: true,
              lastSeen: presenceUser.lastSeen
            });
          }
        }
      }

      // Limit to first 10 online users for performance
      const limitedUsers = onlineUsersList.slice(0, 10);
      setOnlineUsers(limitedUsers);
      
      // debugLogger.success('LOAD_ONLINE_USERS', `Loaded ${limitedUsers.length} online users`);
    } catch (error) {
      // debugLogger.error('LOAD_ONLINE_USERS', 'Failed to load online users', error);
    }
  }, [presenceOnlineUsers, currentUser?.id]);

  // Send media message - FIXED to upload to storage and database
  const sendMediaMessage = async (message: Partial<Message>) => {
    if (!currentUser?.id || !selectedConversation) return;

    const tempId = `temp-${Date.now()}`;
    
    try {
      debugLogger.info('SEND_MEDIA', 'START', `Sending ${message.type} message`);
      const tempMessage: Message = {
        id: tempId,
        senderId: currentUser.id,
        receiverId: otherUser?.id || '',
        content: message.content || '',
        type: message.type || 'text',
        mediaUrl: message.mediaUrl,
        thumbnailUrl: message.thumbnailUrl,
        duration: message.duration,
        sharedReel: message.sharedReel,
        sharedPost: message.sharedPost,
        timestamp: new Date().toISOString(),
        conversationId: selectedConversation,
        isRead: false
      };

      // Add message immediately to UI for optimistic updates
      setMessages(prev => [tempMessage, ...prev]);

      let uploadedMediaUrl = null;
      
      // Upload media to storage if this is a media message (not for shared content)
      if (message.type && ['image', 'video', 'audio'].includes(message.type) && message.mediaUrl) {
        debugLogger.info('SEND_MEDIA', 'UPLOADING', `Uploading ${message.type} to storage`);
        
        try {
          const file = {
            uri: message.mediaUrl,
            type: message.type === 'image' ? 'image/jpeg' : 
                  message.type === 'video' ? 'video/mp4' : 'audio/mp4',
            name: `conversation_${message.type}_${Date.now()}.${
              message.type === 'image' ? 'jpg' : 
              message.type === 'video' ? 'mp4' : 'm4a'
            }`
          };

          const uploadResult = message.type === 'image' 
            ? await dataService.storage.uploadImage(file, 'user-media', currentUser.id, {
                folder: 'conversations'
              })
            : await dataService.storage.uploadVideo(file, 'user-media', currentUser.id, {
                folder: 'conversations'
              });

          if (uploadResult) {
            uploadedMediaUrl = uploadResult.url;
            debugLogger.success('SEND_MEDIA', 'UPLOAD_SUCCESS', `Media uploaded: ${uploadedMediaUrl}`);
          } else {
            throw new Error('Failed to upload media to storage');
          }
        } catch (uploadError) {
          debugLogger.error('SEND_MEDIA', 'UPLOAD_ERROR', uploadError);
          // Remove temp message on upload failure
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          Alert.alert('Error', 'Failed to upload media. Please try again.');
          return;
        }
      }

      // Send message to database with uploaded media URL or shared content
      try {
        const messageContent = message.content || 
                              (message.type === 'image' ? '📷 Photo' : 
                               message.type === 'audio' ? '🎤 Voice message' : 
                               message.type === 'video' ? '🎥 Video' :
                               message.type === 'reel' ? `📹 Shared a reel` :
                               message.type === 'post' ? `📸 Shared a post` : 'Media');
        
        const savedMessage = await dataService.message.sendMessage(
          selectedConversation,
          currentUser.id,
          messageContent,
          message.type || 'text',
          message.sharedPost,
          message.sharedReel,
          uploadedMediaUrl || undefined
        );

        if (savedMessage) {
          debugLogger.success('SEND_MEDIA', 'MESSAGE_SAVED', `Message saved to database with media URL`);
        }

        if (savedMessage) {
          // Replace temp message with real message
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? {
              ...savedMessage,
              mediaUrl: uploadedMediaUrl || savedMessage.mediaUrl,
              type: message.type || savedMessage.type,
              duration: message.duration,
              thumbnailUrl: message.thumbnailUrl
            } : msg
          ));
          
          debugLogger.success('SEND_MEDIA', 'SUCCESS', 'Media message sent and saved to database');
        } else {
          throw new Error('Failed to save message to database');
        }
      } catch (dbError) {
        debugLogger.error('SEND_MEDIA', 'DB_ERROR', dbError);
        // Remove temp message on database failure
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }

    } catch (error) {
      debugLogger.error('SEND_MEDIA', 'Error sending media message', error);
      // Remove temp message on any other failure - use tempId from the beginning of the function
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      Alert.alert('Error', 'Failed to send media message. Please try again.');
    }
  };

  // Handle media message sending
  const handleSendMedia = (type: 'image' | 'voice' | 'reel' | 'post', data: any) => {
    sendMediaMessage({
      type,
      content: data.content || '',
      mediaUrl: data.mediaUrl || data.uri,
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration,
      sharedReel: data.sharedReel,
      sharedPost: data.sharedPost
    });
  };

  // Create new conversation
  const createConversation = async (withUserId?: string) => {
    if (!currentUser?.id) return;
    
    try {
      // Create participants array - include current user and the other user if provided
      const participants = withUserId ? [currentUser.id, withUserId] : [currentUser.id];
      
      debugLogger.info('CREATE_CONVERSATION', 'Creating conversation', { 
        participants, 
        withUserId,
        currentUserId: currentUser.id 
      });
      
      const conversationId = await dataService.message.createConversation(participants);
      
      if (conversationId) {
        debugLogger.success('CREATE_CONVERSATION', 'Conversation created successfully', { conversationId });
        
        // If created with a specific user, open the conversation
        if (withUserId) {
          setSelectedConversation(conversationId);
          setMode('chat');
          await loadMessages(conversationId);
        }
        
        // Refresh conversations list
        await loadConversations();
      } else {
        throw new Error('Failed to create conversation - no ID returned');
      }
    } catch (err) {
      debugLogger.error('CREATE_CONVERSATION', 'Failed to create conversation', err);
      Alert.alert('Error', 'Failed to create conversation');
    }
  };

  // Handle conversation selection
  const handleConversationPress = (conversation: Conversation) => {
    loadMessages(conversation.id);
  };

  // Handle back navigation
  const handleBack = () => {
    if (mode === 'chat') {
      setMode('list');
      setSelectedConversation(null);
      setMessages([]);
      setOtherUser(null);
    } else {
      // Navigate to feeds screen from messages list
      router.push('/(tabs)' as any);
    }
  };

  // Load initial data
  useEffect(() => {
    loadConversations();
  }, [currentUser?.id]);

  // Handle initial conversation if provided
  useEffect(() => {
    if (params.conversationId && params.userId && params.mode !== 'list') {
      debugLogger.info('INIT_CONVERSATION', 'Loading specific conversation from URL', { 
        conversationId: params.conversationId,
        userId: params.userId,
        mode: params.mode 
      });
      
      setSelectedConversation(params.conversationId);
      setMode('chat');
      
      // Load other user info
      if (params.userId) {
        dataService.user.getUserProfile(params.userId).then(user => {
          setOtherUser(user);
        });
      }
      
      // Load messages
      loadMessages(params.conversationId);
    } else if (params.conversationId && params.userId && params.mode === 'list') {
      debugLogger.info('INIT_CONVERSATION', 'Skipping conversation load - staying in list mode', { 
        conversationId: params.conversationId,
        userId: params.userId,
        mode: params.mode 
      });
    }
  }, [params.conversationId, params.userId, params.mode]);

  // Handle createWithUserId parameter - auto-create conversation with specific user
  useEffect(() => {
    if (params.createWithUserId && currentUser?.id) {
      debugLogger.info('AUTO_CREATE_CONVERSATION', 'Creating conversation with user', { 
        createWithUserId: params.createWithUserId,
        userName: params.userName 
      });
      
      // First try to get the user profile to set otherUser
      dataService.user.getUserProfile(params.createWithUserId).then(user => {
        if (user) {
          setOtherUser(user);
          debugLogger.info('AUTO_CREATE_CONVERSATION', `Set other user from profile: ${user.username}`, { userId: user.id });
        }
      }).catch(err => {
        debugLogger.warn('AUTO_CREATE_CONVERSATION', 'Failed to load user profile', err);
      });
      
      createConversation(params.createWithUserId);
    }
  }, [params.createWithUserId, currentUser?.id]);

  // Load online users when presence context changes
  useEffect(() => {
    if (currentUser?.id && mode === 'list') {
      loadOnlineUsers();
    }
  }, [presenceOnlineUsers, currentUser?.id, mode, loadOnlineUsers]);

  // Handle keyboard events for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && mode === 'chat') {
      const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      
      const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }
  }, [mode]);

  // Filter conversations based on search - MEMOIZED to prevent infinite re-renders
  const filteredConversations = React.useMemo(() => {
    return conversations.filter(conv => {
      if (!searchQuery.trim()) return true;
      
      const searchLower = searchQuery.toLowerCase();
      const participantNames = conv.participants
        .map(p => p.username?.toLowerCase() || p.fullName?.toLowerCase() || '')
        .join(' ');
      const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';
      
      return participantNames.includes(searchLower) || lastMessage.includes(searchLower);
    });
  }, [conversations, searchQuery]);

  // Debug filtered conversations - REDUCED LOGGING FREQUENCY
  React.useEffect(() => {
    // Only log in development and reduce frequency to prevent spam
    if (__DEV__ && Math.random() < 0.2) {
      debugLogger.info('CONVERSATIONS_FILTERED', `Filtered conversations for UI`, {
        totalConversations: conversations.length,
        filteredCount: filteredConversations.length,
        searchQuery,
        currentUserId: currentUser?.id,
        filteredConversations: filteredConversations.map(c => ({
          id: c.id,
          participants: c.participants?.map(p => ({ id: p.id, username: p.username })) || []
        }))
      });
      
      // Simple test to see if conversations exist
      if (conversations.length > 0) {
        console.log('🔍 CONVERSATIONS DEBUG:', {
          count: conversations.length,
          firstConversation: conversations[0],
          participants: conversations[0]?.participants,
          lastMessage: conversations[0]?.lastMessage
        });
      } else {
        console.log('🔍 NO CONVERSATIONS FOUND');
      }
    }
  }, [conversations.length, filteredConversations.length, searchQuery]); // Only depend on lengths, not full objects

  // Render conversation list item - reduced logging
  const renderConversationItem = ({ item, index }: { item: any; index: number }) => {
    const conversation = item as Conversation;
    // Reduced logging frequency to prevent spam
    if (__DEV__ && Math.random() < 0.1) {
      debugLogger.info('RENDER_CONVERSATION_ITEM', `Rendering conversation item ${index}`, {
        conversationId: conversation.id,
        currentUserId: currentUser?.id,
        participants: conversation.participants?.map(p => ({ id: p.id, username: p.username, fullName: p.fullName })) || []
      });
    }
    
    // Since getConversations already filters out current user, participants array contains only other users
    const otherParticipant = conversation.participants[0]; // Take the first (and likely only) other participant
    
    // Get real-time presence status for this participant
    const isOnline = otherParticipant ? isUserOnline(otherParticipant.id) : false;
    
    // Temporary fix: If no participant found, show the conversation anyway with placeholder data
    if (!otherParticipant) {
      debugLogger.warn('RENDER_CONVERSATION_ITEM', `No other participant found for conversation ${conversation.id} - showing with placeholder`, {
        conversationId: conversation.id,
        currentUserId: currentUser?.id,
        participants: conversation.participants?.map(p => ({ id: p.id, username: p.username })) || []
      });
      
      // Show conversation with placeholder participant info
      const placeholderParticipant = {
        id: 'unknown',
        username: 'Unknown User',
        avatar: 'https://via.placeholder.com/50',
        fullName: 'Unknown User'
      };
      
      return (
        <AnimatedTouchableOpacity
          style={styles.conversationItem}
          onPress={() => handleConversationPress(conversation)}
          entering={FadeIn.delay(index * 50)}
        >
          <CachedImage 
            source={{ uri: placeholderParticipant.avatar }} 
            style={styles.conversationAvatar} 
            cacheType="thumbnail"
          />
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName}>{placeholderParticipant.username}</Text>
              <Text style={styles.conversationTime}>
                {new Date(conversation.lastMessage?.timestamp || conversation.updatedAt || '').toLocaleString()}
              </Text>
            </View>
            <Text style={styles.conversationPreview} numberOfLines={2}>
              {conversation.lastMessage?.content || 'No messages yet'} (Missing participant data)
            </Text>
          </View>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
            </View>
          )}
        </AnimatedTouchableOpacity>
      );
    }

    return (
      <AnimatedTouchableOpacity
        style={styles.modernConversationItem}
        onPress={() => handleConversationPress(conversation)}
        entering={SlideInRight.delay(index * 50).springify()}
        activeOpacity={0.7}
      >
        <View style={styles.modernAvatarContainer}>
          {otherParticipant.avatar ? (
            <CachedImage 
              source={{ uri: otherParticipant.avatar }} 
              style={styles.modernConversationAvatar} 
              cacheType="thumbnail"
            />
          ) : (
            <View style={styles.modernPlaceholderAvatar}>
              <User color="#FFFFFF" size={20} />
            </View>
          )}
          <View style={[
            styles.modernOnlineIndicator,
            { backgroundColor: isOnline ? '#00D084' : 'transparent' }
          ]} />
        </View>
        
        <View style={styles.modernConversationContent}>
          <View style={styles.modernConversationHeader}>
            <Text style={styles.modernConversationName} numberOfLines={1}>
              {otherParticipant.fullName || otherParticipant.username}
            </Text>
            <Text style={styles.modernConversationTime}>
              {new Date(conversation.lastMessage?.timestamp || conversation.updatedAt || '').toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <Text style={styles.modernConversationPreview} numberOfLines={1}>
            {conversation.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
        
        {conversation.unreadCount > 0 && (
          <View style={styles.modernUnreadBadge}>
            <Text style={styles.modernUnreadText}>{conversation.unreadCount}</Text>
          </View>
        )}
      </AnimatedTouchableOpacity>
    );
  };

  // Handle image press - open image viewer with zoom
  const handleImagePress = (imageUri: string) => {
    setImageViewerUri(imageUri);
    setImageViewerVisible(true);
  };

  // Handle content press - navigate to post/reel detail
  const handleContentPress = (content: Post | Reel | any) => {
    console.log('🔥 CONTENT_PRESS - Content received:', content);
    console.log('🔥 CONTENT_PRESS - Content type detection:', {
      hasExpiresAt: !!content.expiresAt,
      hasExpires_at: !!content.expires_at,
      hasMediaType: !!content.mediaType,
      mediaType: content.mediaType,
      hasVideoUrl: !!content.videoUrl,
      hasImage: !!content.image,
      hasImageUrl: !!content.imageUrl,
      contentKeys: Object.keys(content || {})
    });
    
    // Add null/undefined check
    if (!content) {
      console.log('❌ CONTENT_PRESS - Content is null/undefined');
      Alert.alert('Error', 'Content not available');
      return;
    }

    // Check if it's a story first (before reel check)
    if (content.expiresAt || content.expires_at || (content.mediaType && content.mediaType !== 'reel')) {
      console.log('📖 CONTENT_PRESS - Detected as STORY');
      // Check if story has expired
      const expiresAt = new Date(content.expiresAt || content.expires_at);
      if (expiresAt <= new Date()) {
        Alert.alert('Story Expired', 'This story is no longer available.');
        return;
      }
      
      // It's a story - navigate to the user's stories
      console.log('📖 CONTENT_PRESS - Opening story for user:', content.user?.id);
      router.push({
        pathname: '/(tabs)',
        params: { 
          openStory: 'true',
          userId: content.user?.id,
          storyId: content.id,
          fromMessage: 'true'
        }
      });
      return;
    }

    // Check if it's a post or reel and navigate accordingly
    if ('videoUrl' in content) {
      console.log('🎬 CONTENT_PRESS - Detected as REEL, navigating to reels');
      // It's a reel - navigate to reels page with specific reel ID
      router.push({
        pathname: '/(tabs)/reels',
        params: { 
          startReelId: content.id,
          fromMessage: 'true'
        }
      });
    } else {
      // It's a post - open image viewer for the post image
      if (content.image || content.imageUrl) {
        const imageUri = content.image || content.imageUrl || '';
        setImageViewerUri(imageUri);
        setImageViewerVisible(true);
      } else {
        Alert.alert('Post', 'This post doesn\'t have an image to view');
      }
    }
  };

  // Handle message long press
  const handleMessageLongPress = (message: Message) => {
    console.log('🔥 LONG_PRESS_HANDLER - Message long press received:', { messageId: message.id, messageType: message.type });
    setSelectedMessage(message);
    setMessageOptionsVisible(true);
    console.log('🔥 MODAL_OPENING - Message options modal should be visible now');
  };

  // Handle message copy
  const handleMessageCopy = async (message: Message) => {
    try {
      Clipboard.setString(message.content);
      Alert.alert('Copied', 'Message copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy message');
    }
  };

  // Handle message edit
  const handleMessageEdit = (message: Message) => {
    setSelectedMessage(message);
    setEditMessageVisible(true);
  };

  // Handle message delete
  const handleMessageDelete = (message: Message) => {
    console.log('🔥 DELETE_HANDLER - Delete button pressed:', { messageId: message.id, messageType: message.type });
    const isMediaMessage = message.type !== 'text';
    const title = isMediaMessage ? 'Unsend Message' : 'Delete Message';
    const content = isMediaMessage 
      ? 'Are you sure you want to unsend this message? It will be removed from the conversation.'
      : 'Are you sure you want to delete this message?';
    const buttonText = isMediaMessage ? 'Unsend' : 'Delete';
    
    console.log('🔥 SHOWING_CONFIRMATION - About to show confirmation modal:', { title, content, buttonText });
    
    setConfirmationData({
      title,
      message: content,
      confirmText: buttonText,
      onConfirm: () => {
        console.log('🔥 CONFIRM_DELETE - User confirmed deletion via modal');
        confirmDeleteMessage(message);
      }
    });
    setConfirmationVisible(true);
  };

  // Confirm delete message
  const confirmDeleteMessage = async (message: Message) => {
    try {
      const success = await dataService.message.deleteMessage(message.id, currentUser?.id || '');
      if (success) {
        // Refresh messages to show the updated state
        if (params.conversationId) {
          loadMessages(params.conversationId);
        }
        const isMediaMessage = message.type !== 'text';
        Alert.alert('Success', isMediaMessage ? 'Message unsent' : 'Message deleted');
      } else {
        const isMediaMessage = message.type !== 'text';
        Alert.alert('Error', isMediaMessage ? 'Failed to unsend message' : 'Failed to delete message');
      }
    } catch (error) {
      const isMediaMessage = message.type !== 'text';
      Alert.alert('Error', isMediaMessage ? 'Failed to unsend message' : 'Failed to delete message');
    }
  };

  // Save edited message
  const handleSaveEditedMessage = async (messageId: string, newContent: string): Promise<boolean> => {
    try {
      const success = await dataService.message.editMessage(messageId, newContent, currentUser?.id || '');
      if (success) {
        // Refresh messages to show the updated content
        if (params.conversationId) {
          loadMessages(params.conversationId);
        }
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Render message
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const message = item as Message;
    const isOwn = message.senderId === currentUser?.id;
    return (
      <MediaMessageBubble 
        message={message} 
        isOwn={isOwn} 
        otherUser={otherUser || undefined}
        onImagePress={handleImagePress}
        onContentPress={handleContentPress}
        onLongPress={handleMessageLongPress}
      />
    );
  };

  // Chat mode UI
  if (mode === 'chat') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
          <LinearGradient colors={['#0f0518', '#1a0a2e']} style={styles.background}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.chatHeaderInfo}>
                {otherUser ? (
                  <>
                    <Image 
                      source={{ uri: otherUser.avatar || otherUser.profilePicture || 'https://via.placeholder.com/40' }} 
                      style={styles.chatHeaderAvatar} 
                    />
                    <View style={styles.chatHeaderText}>
                      <Text style={styles.chatHeaderName}>
                        {otherUser.fullName || otherUser.username || 'Unknown User'}
                      </Text>
                      <Text style={styles.chatHeaderStatus}>
                        {otherUser.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </Text>
                    </View>
                  </>
                ) : params.userName ? (
                  <>
                    <View style={styles.placeholderAvatar}>
                      <User size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.chatHeaderText}>
                      <Text style={styles.chatHeaderName}>{params.userName}</Text>
                      <Text style={styles.chatHeaderStatus}>Loading...</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.placeholderAvatar}>
                      <MessageCircle size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.chatHeaderText}>
                      <Text style={styles.chatHeaderName}>Chat</Text>
                      <Text style={styles.chatHeaderStatus}>Loading conversation...</Text>
                    </View>
                  </>
                )}
              </View>
              
              <TouchableOpacity style={styles.moreButton}>
                <MoreVertical size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <View style={[styles.messagesContainer, Platform.OS === 'ios' && keyboardHeight > 0 && { marginBottom: 0 }]}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6C5CE7" />
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : (
                <AnimatedFlatList
                  data={messages.filter(item => item && item.id) as Message[]}
                  renderItem={renderMessage}
                  keyExtractor={(item: any) => item?.id || `message-${Math.random()}`}
                  contentContainerStyle={[
                    styles.messagesList,
                    Platform.OS === 'ios' && keyboardHeight > 0 && { paddingBottom: 10 }
                  ]}
                  showsVerticalScrollIndicator={false}
                  inverted
                />
              )}
            </View>

            {/* Media Message Input */}
            <View style={[
              styles.inputWrapper,
              Platform.OS === 'ios' && keyboardHeight > 0 && { marginBottom: 0 }
            ]}>
              <MediaMessageInput
                value={newMessage}
                onChangeText={setNewMessage}
                onSendMessage={sendMessage}
                onSendMedia={handleSendMedia}
                placeholder="Type a message..."
                disabled={loading}
                recentPosts={recentPosts}
                recentReels={recentReels}
              />
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
        
        {/* Image Viewer Modal */}
        <ImageViewerModal
          visible={imageViewerVisible}
          imageUri={imageViewerUri}
          onClose={() => setImageViewerVisible(false)}
        />

        {/* Message Options Modal */}
        <MessageOptionsModal
          visible={messageOptionsVisible}
          onClose={() => setMessageOptionsVisible(false)}
          message={selectedMessage!}
          isOwn={selectedMessage?.senderId === currentUser?.id}
          onEdit={handleMessageEdit}
          onDelete={handleMessageDelete}
          onCopy={handleMessageCopy}
        />

        {/* Edit Message Modal */}
        <EditMessageModal
          visible={editMessageVisible}
          onClose={() => setEditMessageVisible(false)}
          message={selectedMessage}
          onSave={handleSaveEditedMessage}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          visible={confirmationVisible}
          onClose={() => setConfirmationVisible(false)}
          title={confirmationData?.title || ''}
          message={confirmationData?.message || ''}
          confirmText={confirmationData?.confirmText || 'Confirm'}
          onConfirm={() => {
            confirmationData?.onConfirm();
            setConfirmationVisible(false);
          }}
          isDestructive={true}
        />
      </SafeAreaView>
    );
  }

  // List mode UI
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1E1E1E', '#301E5A', '#1E1E1E']} style={styles.background}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.modernHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <MessageCircle size={28} color="#6C5CE7" />
            <Text style={styles.modernHeaderTitle}>Messages</Text>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.modernSearchContainer}>
          <View style={styles.modernSearchBar}>
            <TextInput
              style={styles.modernSearchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search conversations..."
              placeholderTextColor="#999999"
              returnKeyType="search"
            />
            <TouchableOpacity 
              onPress={() => setSearchQuery('')} 
              style={styles.modernSearchButton}
            >
              <Search size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Online Users Section */}
        {onlineUsers.length > 0 && (
          <Animated.View entering={FadeIn.delay(400)} style={styles.onlineSection}>
            <Text style={styles.modernSectionTitle}>Active Now ({onlineUsers.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.onlineUsersList}
            >
              {onlineUsers.map((user, index) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.onlineUserItem}
                  onPress={() => {
                    // Navigate to user profile
                    router.push({
                      pathname: '/ProfileScreen',
                      params: { userId: user.id }
                    });
                  }}
                  onLongPress={() => {
                    // Start conversation directly
                    Alert.alert(
                      'Start Conversation',
                      `Send a message to ${user.fullName || user.username}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Message', 
                          onPress: () => {
                            router.push({
                              pathname: '/conversation',
                              params: { 
                                mode: 'chat',
                                createWithUserId: user.id,
                                userName: user.fullName || user.username
                              }
                            });
                          }
                        }
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Animated.View 
                    entering={SlideInLeft.delay(index * 100).springify()}
                    style={styles.onlineUserAvatarContainer}
                  >
                    {user.avatar ? (
                      <Image 
                        source={{ uri: user.avatar }} 
                        style={styles.onlineUserAvatarImage} 
                      />
                    ) : (
                      <View style={styles.onlineUserAvatar}>
                        <User size={20} color="#FFFFFF" />
                      </View>
                    )}
                    <View style={styles.onlineIndicator} />
                  </Animated.View>
                  <Text style={styles.onlineUserName} numberOfLines={1}>
                    {user.fullName || user.username || 'Unknown'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Conversations Section */}
        <View style={styles.conversationsSection}>
          <View style={styles.modernSectionHeader}>
            <Text style={styles.modernSectionTitle}>
              {searchQuery ? `Search Results (${filteredConversations.length})` : 'Recent'}
            </Text>
            {!loading && (
              <View style={styles.connectionStatus}>
                <Text style={styles.connectionText}>Online</Text>
              </View>
            )}
          </View>
        </View>

        {/* Conversations List */}
        {filteredConversations.length > 0 ? (
          <AnimatedFlatList
            data={filteredConversations.filter(item => item && item.id) as Conversation[]}
            renderItem={renderConversationItem}
            keyExtractor={(item: any) => item?.id || `conversation-${Math.random()}`}
            contentContainerStyle={styles.modernConversationsList}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadConversations}
                tintColor="#6C5CE7"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <Animated.View entering={FadeIn.delay(600)} style={styles.modernEmptyState}>
            <MessageCircle size={64} color="#6C5CE7" />
            <Text style={styles.modernEmptyTitle}>No messages yet</Text>
            <Text style={styles.modernEmptySubtitle}>
              Find people to start conversations with
            </Text>
            
            <View style={styles.modernEmptyActions}>
              <TouchableOpacity 
                style={styles.modernPrimaryButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <LinearGradient
                  colors={['#6C5CE7', '#5A4FCF']}
                  style={styles.modernPrimaryButtonGradient}
                >
                  <Search size={16} color="#FFFFFF" />
                  <Text style={styles.modernPrimaryButtonText}>Find People</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={styles.modernOrText}>or</Text>
              
              <TouchableOpacity 
                style={styles.modernSecondaryButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text style={styles.modernSecondaryButtonText}>Browse Online Users</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Floating Action Button */}
        <TouchableOpacity 
          style={styles.modernFab}
          onPress={() => router.push('/(tabs)/search')}
        >
          <LinearGradient
            colors={['#6C5CE7', '#5A4FCF']}
            style={styles.modernFabGradient}
          >
            <Plus size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  inputWrapper: {
    // Wrapper for message input to handle keyboard positioning
  },
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 92, 231, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  // Conversation list styles
  conversationsList: {
    paddingHorizontal: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderConversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  conversationNameContainer: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  onlineStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conversationTime: {
    fontSize: 12,
    color: '#666',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Chat styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 92, 231, 0.2)',
  },
  backButton: {
    marginRight: 15,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#666',
  },
  chatHeaderText: {
    flex: 1,
  },
  placeholderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  moreButton: {
    marginLeft: 15,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesList: {
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 15,
    borderRadius: 20,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C5CE7',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  messageSender: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(108, 92, 231, 0.2)',
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
  },
  // Loading and empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
  },

  // Modern UI Styles
  modernHeader: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modernSearchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modernSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(108, 92, 231, 0.3)',
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 16,
    paddingVertical: 12,
  },
  modernSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingRight: 8,
  },
  modernSearchButton: {
    padding: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderRadius: 20,
    marginRight: 4,
  },
  onlineSection: {
    paddingVertical: 16,
    paddingBottom: 24,
  },
  modernSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  onlineUsersList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  onlineUserItem: {
    alignItems: 'center',
    width: 72,
  },
  onlineUserAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  onlineUserAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineUserAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00D084',
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  onlineUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  conversationsSection: {
    flex: 1,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  connectionStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectionText: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '500',
  },
  modernConversationsList: {
    paddingBottom: 100, // Space for FAB
  },
  modernConversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 76,
  },
  modernAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  modernConversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  modernPlaceholderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  modernConversationContent: {
    flex: 1,
    marginRight: 12,
  },
  modernConversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modernConversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  modernConversationTime: {
    fontSize: 12,
    color: '#999999',
  },
  modernConversationPreview: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
  },
  modernUnreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  modernUnreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modernEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  modernEmptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  modernEmptySubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
  },
  modernEmptyActions: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  modernPrimaryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    width: '80%',
  },
  modernPrimaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  modernPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modernOrText: {
    fontSize: 14,
    color: '#E0E0E0',
    opacity: 0.6,
  },
  modernSecondaryButton: {
    paddingVertical: 12,
  },
  modernSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  modernFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modernFabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  startChatButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyActions: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  findPeopleButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '70%',
    alignItems: 'center',
  },
  findPeopleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    fontSize: 14,
    color: '#666',
    opacity: 0.8,
  },
});