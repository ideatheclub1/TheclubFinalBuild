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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInRight,
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
import { useUser } from '@/contexts/UserContext';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { useMessaging } from '@/hooks/useMessaging';
import { dataService } from '@/services/dataService';
import { Conversation, Message, User as UserType } from '@/types';
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
          <Image source={{ uri: otherUser.avatar }} style={styles.messageAvatar} />
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
  const { isUserOnline, getUserPresence } = usePresenceContext();
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

  // Debug initial state
  debugLogger.info('CONVERSATION_SCREEN', 'INIT', `Component initialized - Mode: ${params.mode || 'list'}, User: ${currentUser?.id}, ConversationId: ${params.conversationId || 'none'}`);
  
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
  }, [currentUser?.id, debugLogger]);

  // Load conversations on mount
  useEffect(() => {
    debugLogger.info('CONVERSATION_SCREEN', 'MOUNT_CHECK', `Checking if should load conversations - User: ${currentUser?.id}, Mode: ${mode}`);
    
    if (currentUser?.id && mode === 'list') {
      debugLogger.info('CONVERSATION_SCREEN', 'MOUNT', 'Loading conversations on screen mount');
      loadConversations();
    } else {
      const reason = !currentUser?.id ? 'No current user' : 'Mode is not list';
      debugLogger.warn('CONVERSATION_SCREEN', 'MOUNT_SKIP', `Skipping conversation load: ${reason}`);
    }
  }, [currentUser?.id, mode]); // Removed loadConversations from dependencies to prevent infinite loop

  // Additional effect to load conversations when user becomes available
  useEffect(() => {
    if (currentUser?.id && mode === 'list' && conversations.length === 0) {
      debugLogger.info('CONVERSATION_SCREEN', 'USER_AVAILABLE', 'User became available, loading conversations');
      loadConversations();
    }
  }, [currentUser?.id]); // Only depend on currentUser.id

  // Load messages for a specific conversation
  const loadMessages = async (conversationId: string) => {
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
      const messages = await dataService.message.getMessages(conversationId, currentUser.id);
      setMessages(messages);
      setSelectedConversation(conversationId);
      setMode('chat');
      
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
      router.back();
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

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const participantNames = conv.participants
      .map(p => p.username?.toLowerCase() || p.fullName?.toLowerCase() || '')
      .join(' ');
    const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';
    
    return participantNames.includes(searchLower) || lastMessage.includes(searchLower);
  });

  // Debug filtered conversations
  React.useEffect(() => {
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
  }, [conversations, filteredConversations, searchQuery, currentUser?.id, debugLogger]);

  // Render conversation list item
  const renderConversationItem = ({ item, index }: { item: Conversation; index: number }) => {
    debugLogger.info('RENDER_CONVERSATION_ITEM', `Rendering conversation item ${index}`, {
      conversationId: item.id,
      currentUserId: currentUser?.id,
      participants: item.participants?.map(p => ({ id: p.id, username: p.username, fullName: p.fullName })) || []
    });
    
    // Since getConversations already filters out current user, participants array contains only other users
    const otherParticipant = item.participants[0]; // Take the first (and likely only) other participant
    
    // Get real-time presence status for this participant
    const isOnline = otherParticipant ? isUserOnline(otherParticipant.id) : false;
    
    // Temporary fix: If no participant found, show the conversation anyway with placeholder data
    if (!otherParticipant) {
      debugLogger.warn('RENDER_CONVERSATION_ITEM', `No other participant found for conversation ${item.id} - showing with placeholder`, {
        conversationId: item.id,
        currentUserId: currentUser?.id,
        participants: item.participants?.map(p => ({ id: p.id, username: p.username })) || []
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
          onPress={() => handleConversationPress(item)}
          entering={FadeIn.delay(index * 50)}
        >
          <Image source={{ uri: placeholderParticipant.avatar }} style={styles.conversationAvatar} />
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName}>{placeholderParticipant.username}</Text>
              <Text style={styles.conversationTime}>
                {new Date(item.lastMessage?.timestamp || item.updatedAt || '').toLocaleString()}
              </Text>
            </View>
            <Text style={styles.conversationPreview} numberOfLines={2}>
              {item.lastMessage?.content || 'No messages yet'} (Missing participant data)
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </AnimatedTouchableOpacity>
      );
    }

    return (
      <AnimatedTouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        entering={FadeIn.delay(index * 50)}
      >
        <View style={styles.avatarContainer}>
          {otherParticipant.avatar ? (
            <Image source={{ uri: otherParticipant.avatar }} style={styles.conversationAvatar} />
          ) : (
            <View style={styles.placeholderConversationAvatar}>
              <User color="#FFFFFF" size={24} />
            </View>
          )}
          <View style={[
            styles.onlineStatusIndicator,
            { backgroundColor: isOnline ? '#00D084' : '#666666' }
          ]} />
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.conversationNameContainer}>
              <Text style={styles.conversationName}>{otherParticipant.username}</Text>
              <Text style={[
                styles.onlineStatusText,
                { color: isOnline ? '#00D084' : '#666666' }
              ]}>
                {isOnline ? '🟢 Online' : '⚫ Offline'}
              </Text>
            </View>
            <Text style={styles.conversationTime}>
              {new Date(item.lastMessage?.timestamp || item.updatedAt || '').toLocaleString()}
            </Text>
          </View>
          <Text style={styles.conversationPreview} numberOfLines={2}>
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unreadCount}</Text>
          </View>
        )}
      </AnimatedTouchableOpacity>
    );
  };

  // Render message
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === currentUser?.id;
    return (
      <MessageBubble 
        message={item} 
        isOwn={isOwn} 
        otherUser={otherUser}
      />
    );
  };

  // Chat mode UI
  if (mode === 'chat') {
    return (
      <SafeAreaView style={styles.container}>
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
          <View style={styles.messagesContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C5CE7" />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : (
              <AnimatedFlatList
                data={messages.filter(item => item && item.id)}
                renderItem={renderMessage}
                keyExtractor={(item) => item?.id || `message-${Math.random()}`}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                inverted
              />
            )}
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Send size={20} color={newMessage.trim() ? "#FFFFFF" : "#666"} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // List mode UI
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f0518', '#1a0a2e']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity 
            style={styles.newButton}
            onPress={() => createConversation()}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor="#666"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Conversations List */}
        <AnimatedFlatList
          data={filteredConversations.filter(item => item && item.id)}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item?.id || `conversation-${Math.random()}`}
          contentContainerStyle={styles.conversationsList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={loadConversations}
              tintColor="#6C5CE7"
            />
          }
          showsVerticalScrollIndicator={false}
          onLayout={() => {
            console.log('🔍 FLATLIST DEBUG:', {
              dataLength: filteredConversations.filter(item => item && item.id).length,
              filteredLength: filteredConversations.length,
              totalConversations: conversations.length,
              mode
            });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageCircle size={48} color="#666" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Find people to start conversations with
              </Text>
              
              <View style={styles.emptyActions}>
                <TouchableOpacity 
                  style={styles.findPeopleButton}
                  onPress={() => router.push('/(tabs)/search')}
                >
                  <Text style={styles.findPeopleButtonText}>Find People</Text>
                </TouchableOpacity>
                
                <Text style={styles.orText}>or</Text>
                
                <TouchableOpacity 
                  style={styles.startChatButton}
                  onPress={() => createConversation()}
                >
                  <Text style={styles.startChatButtonText}>Create Group Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
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