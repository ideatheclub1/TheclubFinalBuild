import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Animated as RNAnimated,
  RefreshControl,
  TextInput,
} from 'react-native';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  runOnJS,
  FadeIn,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { MessageCircle, LocationEdit as Edit2, Pin, Archive, VolumeX, MoveHorizontal as MoreHorizontal, Search, Plus, ArrowLeft } from 'lucide-react-native';
import { mockConversations, mockUsers } from '../data/mockData';
import { Conversation, User } from '../types';
import { useUser } from '@/contexts/UserContext';
import { useDebugLogger, debug } from '@/utils/debugLogger';
import { useMessaging } from '@/hooks/useMessagingSimple';
import { dataService } from '@/services/dataService';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface MessageCardProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
  onUserPress: (userId: string) => void;
  index: number;
}

const MessageCard: React.FC<MessageCardProps> = ({ conversation, onPress, onUserPress, index }) => {
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('MessageCard');
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [showActions, setShowActions] = useState(false);

  // Debug conversation data
  debugLogger.info('CARD_RENDER', `Rendering card for conversation ${conversation.id}`, {
    conversationId: conversation.id,
    currentUserId: currentUser?.id,
    participants: conversation.participants?.map(p => ({ id: p.id, username: p.username, fullName: p.fullName })) || [],
    participantCount: conversation.participants?.length || 0
  });

  const otherUser = conversation.participants.find(p => p.id !== currentUser?.id);
  
  if (!otherUser) {
    debugLogger.warn('CARD_RENDER', `No other user found for conversation ${conversation.id}`, {
      conversationId: conversation.id,
      currentUserId: currentUser?.id,
      participants: conversation.participants?.map(p => ({ id: p.id, username: p.username })) || []
    });
    return null;
  }

  debugLogger.info('CARD_RENDER', `Found other user: ${otherUser.username || otherUser.fullName}`, {
    otherUserId: otherUser.id,
    otherUserName: otherUser.username || otherUser.fullName
  });

  const handlePinMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Pinned', `Conversation with ${otherUser.username} has been pinned`);
  };

  const handleArchiveMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Archived', `Conversation with ${otherUser.username} has been archived`);
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        scale.value = withSpring(0.95);
      } else {
        scale.value = withSpring(1);
      }
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - Pin/Mark as Unread
        runOnJS(handlePinMessage)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - Archive/Mute
        runOnJS(handleArchiveMessage)();
      }
      
      translateX.value = withSpring(0);
      scale.value = withSpring(1);
    },
  });

  const handleCardPress = () => {
    scale.value = withSequence(
      withSpring(0.96, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(conversation);
  };

  const handleUserPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUserPress(otherUser.id);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  const rightActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
    transform: [
      { translateX: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [0, 50], 'clamp') }
    ],
  }));

  const leftActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
    transform: [
      { translateX: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [-50, 0], 'clamp') }
    ],
  }));

  // Story ring animation for users with active stories
  const storyRingGlow = useSharedValue(0);
  const hasStory = Math.random() > 0.5; // Mock story status

  React.useEffect(() => {
    if (hasStory) {
      storyRingGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.3, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [hasStory]);

  const storyRingStyle = useAnimatedStyle(() => ({
    shadowOpacity: hasStory ? interpolate(storyRingGlow.value, [0, 1], [0.3, 0.8]) : 0,
    shadowRadius: hasStory ? interpolate(storyRingGlow.value, [0, 1], [8, 16]) : 0,
  }));

  return (
    <View style={styles.messageCardContainer}>
      {/* Left Actions (Pin/Mark as Unread) */}
      <Animated.View style={[styles.leftActions, leftActionsStyle]}>
        <View style={styles.actionButton}>
          <Pin size={20} color="#6C5CE7" />
        </View>
      </Animated.View>

      {/* Right Actions (Archive/Mute) */}
      <Animated.View style={[styles.rightActions, rightActionsStyle]}>
        <View style={styles.actionButton}>
          <Archive size={20} color="#EF4444" />
        </View>
      </Animated.View>

      {/* Message Card */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <AnimatedTouchableOpacity
          style={[styles.messageCard, animatedStyle]}
          onPress={handleCardPress}
          entering={FadeIn.delay(index * 100).springify()}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 20 : 0} style={styles.cardBlur}>
            <View style={styles.cardContent}>
              {/* Avatar with Story Ring */}
              <TouchableOpacity onPress={handleUserPress}>
                <Animated.View style={[styles.avatarContainer, storyRingStyle]}>
                  {hasStory && (
                    <View style={styles.storyRing}>
                      <LinearGradient
                        colors={['#6C5CE7', '#8B5CF6', '#A855F7']}
                        style={styles.storyGradient}
                      />
                    </View>
                  )}
                  <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                  <View style={styles.onlineIndicator} />
                </Animated.View>
              </TouchableOpacity>

              {/* Message Content */}
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <TouchableOpacity onPress={handleUserPress}>
                    <Text style={styles.username}>@{otherUser.username}</Text>
                  </TouchableOpacity>
                  <View style={styles.timestampContainer}>
                    <Text style={styles.timestamp}>• {conversation.lastMessage.timestamp}</Text>
                  </View>
                </View>
                
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {conversation.lastMessage.content}
                </Text>
              </View>

              {/* Unread Badge */}
              {conversation.unreadCount > 0 && (
                <Animated.View 
                  style={styles.unreadBadge}
                  entering={SlideInRight.springify()}
                >
                  <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                </Animated.View>
              )}
            </View>
          </BlurView>
        </AnimatedTouchableOpacity>
      </PanGestureHandler>
    </View>
  );
};

export default function MessagesScreen() {
  const debugLogger = useDebugLogger('MessagesScreen');
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { 
    conversations, 
    loading, 
    error, 
    isConnected,
    loadConversations,
    createConversation,
    clearError 
  } = useMessaging();
  
  const [onlineUsers, setOnlineUsers] = useState<User[]>(mockUsers.slice(0, 6));
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  // Load conversations on mount
  useEffect(() => {
    if (currentUser?.id) {
      debugLogger.info('MESSAGES_SCREEN', 'MOUNT', 'Loading conversations on screen mount');
      loadConversations();
    }
  }, [currentUser?.id, loadConversations]);

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Messages screen loaded', { 
      conversationsCount: conversations.length,
      onlineUsersCount: onlineUsers.length,
      isConnected
    });
  }, [conversations.length, onlineUsers.length, isConnected]);

  // Filter conversations based on search query
  useEffect(() => {
    debugLogger.info('MESSAGES_SCREEN', 'CONVERSATIONS_UPDATE', `Processing ${conversations.length} conversations`, {
      conversations: conversations.map(c => ({
        id: c.id,
        participantCount: c.participants?.length || 0,
        participants: c.participants?.map(p => ({ id: p.id, username: p.username, fullName: p.fullName })) || [],
        lastMessage: c.lastMessage?.content || 'No message'
      }))
    });

    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv => 
        conv.participants.some(participant => 
          participant.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          participant.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery, debugLogger]);
  
  // FAB Animation
  const fabScale = useSharedValue(1);
  const fabGlow = useSharedValue(0);

  React.useEffect(() => {
    // FAB glow animation
    fabGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: '/conversation',
      params: { 
        conversationId: conversation.id,
        userId: conversation.participants[0]?.id || '',
        userName: conversation.participants[0]?.username || ''
      }
    });
  };

  const handleUserPress = (userId: string) => {
    if (!userId || !currentUser?.id) return;
    
    if (userId === currentUser.id) {
      Alert.alert(
        'Your Profile',
        'You are viewing your own profile.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }
    router.push({
      pathname: '/ProfileScreen',
      params: { userId }
    });
  };

  const handleNewMessage = async () => {
    fabScale.value = withSequence(
      withSpring(0.9, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Navigate to search screen to select a user
    router.push('/(tabs)/search');
  };

  const handleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simple search toggle - for web compatibility
    Alert.alert(
      'Search Conversations',
      'Type in the search box above to filter conversations by username or message content.',
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Clear Search', 
          onPress: () => setSearchQuery(''),
          style: 'destructive'
        }
      ]
    );
  };

  const handleRefresh = async () => {
    try {
      await loadConversations();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      debugLogger.error('MESSAGES', 'REFRESH_ERROR', 'Failed to refresh conversations', err);
    }
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const startConversationWithUser = async (userId: string, userName?: string) => {
    if (!currentUser?.id) return;

    if (userId === currentUser.id) {
      Alert.alert('Info', 'You cannot message yourself');
      return;
    }
    
    try {
      debugLogger.process('MESSAGES', 'START_CONVERSATION', `Starting conversation with user: ${userId}`);
      
      // First, check if conversation already exists
      const existingConversationId = await dataService.message.findConversationWithUser(
        currentUser.id, 
        userId
      );

      if (existingConversationId) {
        // Redirect to existing conversation
        debugLogger.success('MESSAGES', 'EXISTING_CONVERSATION_FOUND', 'Redirecting to existing conversation', { 
          conversationId: existingConversationId 
        });
        
        router.push({
          pathname: '/conversation',
          params: { 
            mode: 'chat',
            conversationId: existingConversationId,
            userId: userId,
            userName: userName
          }
        });
      } else {
        // Create new conversation
        debugLogger.info('MESSAGES', 'NEW_CONVERSATION', 'Creating new conversation');
        
        const conversationId = await createConversation([userId]);
        
        if (conversationId) {
          router.push({
            pathname: '/conversation',
            params: { 
              conversationId,
              userId,
              userName: userName
            }
          });
        } else {
          Alert.alert('Error', 'Failed to create conversation');
        }
      }
    } catch (err) {
      debugLogger.error('MESSAGES', 'START_CONVERSATION_ERROR', 'Failed to start conversation', err);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
    shadowOpacity: interpolate(fabGlow.value, [0, 1], [0.4, 0.8]),
    shadowRadius: interpolate(fabGlow.value, [0, 1], [12, 20]),
  }));

  const renderOnlineUser = ({ item, index }: { item: User; index: number }) => (
    <AnimatedTouchableOpacity
      style={styles.onlineUserContainer}
      onPress={() => handleUserPress(item.id)}
      entering={SlideInLeft.delay(index * 50).springify()}
    >
      <View style={styles.onlineUserImageContainer}>
        <Image source={{ uri: item.avatar }} style={styles.onlineUserImage} />
        <View style={styles.onlineUserIndicator} />
      </View>
      <Text style={styles.onlineUserName} numberOfLines={1}>
        {item.username}
      </Text>
    </AnimatedTouchableOpacity>
  );

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.delay(300)}>
      <View style={styles.emptyState}>
        <MessageCircle size={64} color="#6C5CE7" />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Find people to start conversations with
        </Text>
        
        <View style={styles.emptyActions}>
          <TouchableOpacity style={styles.findPeopleButton} onPress={() => router.push('/(tabs)/search')}>
            <LinearGradient
              colors={['#6C5CE7', '#5A4FCF']}
              style={styles.findPeopleGradient}
            >
              <Search size={16} color="#FFFFFF" />
              <Text style={styles.findPeopleText}>Find People</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.orText}>or</Text>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleNewMessage}>
            <Text style={styles.startChatText}>Browse Online Users</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaWrapper style={styles.container} backgroundColor="#1E1E1E">
      <LinearGradient
        colors={['#1E1E1E', '#301E5A', '#1E1E1E']}
        style={styles.background}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(800)}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                  <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <MessageCircle size={28} color="#6C5CE7" />
                <Text style={styles.headerTitle}>Messages</Text>
              </View>
              
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search conversations..."
                  placeholderTextColor="#999999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                  <Search size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Online Users Section */}
        <Animated.View entering={FadeIn.delay(200)}>
          <View style={styles.onlineSection}>
            <Text style={styles.sectionTitle}>Active Now</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.onlineList}
            >
              {onlineUsers.map((user, index) => (
                <View key={user.id}>
                  {renderOnlineUser({ item: user, index })}
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Messages List */}
        <View style={styles.messagesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Search Results (${filteredConversations.length})` : 'Recent'}
            </Text>
            {!isConnected && (
              <View style={styles.connectionStatus}>
                <Text style={styles.connectionText}>Offline</Text>
              </View>
            )}
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError} style={styles.dismissButton}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : filteredConversations.length > 0 ? (
            <ScrollView
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={handleRefresh}
                  tintColor="#6C5CE7"
                  colors={['#6C5CE7']}
                />
              }
            >
              {filteredConversations.map((conversation, index) => (
                <MessageCard
                  key={conversation.id}
                  conversation={conversation}
                  onPress={handleConversationPress}
                  onUserPress={handleUserPress}
                  index={index}
                />
              ))}
            </ScrollView>
          ) : (
            renderEmptyState()
          )}
        </View>

        {/* Floating Action Button */}
        <AnimatedTouchableOpacity
          style={[styles.fab, fabAnimatedStyle]}
          onPress={handleNewMessage}
        >
          <LinearGradient
            colors={['#6C5CE7', '#5A4FCF']}
            style={styles.fabGradient}
          >
            <Edit2 size={24} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
        </AnimatedTouchableOpacity>
      </LinearGradient>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    paddingLeft: 16,
    flex: 1,
    marginLeft: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
  searchButton: {
    padding: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
    borderRadius: 20,
    marginRight: 4,
  },
  onlineSection: {
    paddingVertical: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  onlineList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  onlineUserContainer: {
    alignItems: 'center',
    width: 72,
  },
  onlineUserImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  onlineUserImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  onlineUserIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00D46A',
    borderWidth: 3,
    borderColor: '#1E1E1E',
  },
  onlineUserName: {
    fontSize: 12,
    color: '#E0E0E0',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  messagesSection: {
    flex: 1,
    paddingTop: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for FAB
  },
  messageCardContainer: {
    position: 'relative',
    marginVertical: 6,
  },
  leftActions: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    zIndex: 1,
  },
  rightActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 16,
    zIndex: 1,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  messageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardBlur: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  storyRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 78,
    height: 78,
    borderRadius: 39,
    padding: 3,
  },
  storyGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#1E1E1E',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00D46A',
    borderWidth: 3,
    borderColor: '#1E1E1E',
    shadowColor: '#00D46A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#E0E0E0',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  lastMessage: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  unreadBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginLeft: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  unreadCount: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  startChatButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  startChatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C5CE7',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyActions: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  findPeopleButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    width: '80%',
  },
  findPeopleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  findPeopleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  orText: {
    fontSize: 14,
    color: '#E0E0E0',
    opacity: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  secondaryButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6C5CE7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(108, 92, 231, 0.5)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  connectionStatus: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  connectionText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1,
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 6,
    marginLeft: 12,
  },
  dismissText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
});