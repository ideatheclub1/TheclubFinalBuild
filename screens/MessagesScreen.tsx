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
import { MessageCircle, LocationEdit as Edit2, Pin, Archive, VolumeX, MoveHorizontal as MoreHorizontal, Search, Plus } from 'lucide-react-native';
import { mockConversations, mockUsers } from '../data/mockData';
import { Conversation, User } from '../types';
import { useUser } from '@/contexts/UserContext';
import { useDebugLogger, debug } from '@/utils/debugLogger';

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
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [showActions, setShowActions] = useState(false);

  const otherUser = conversation.participants.find(p => p.id !== '1');
  if (!otherUser) return null;

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
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [onlineUsers, setOnlineUsers] = useState<User[]>(mockUsers.slice(0, 6));

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Messages screen loaded', { 
      conversationsCount: conversations.length,
      onlineUsersCount: onlineUsers.length 
    });
  }, []);
  
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
    const otherUser = conversation.participants.find(p => p.id !== '1');
    if (otherUser) {
      router.push({
        pathname: '/conversation',
        params: { userId: otherUser.id, userName: otherUser.username }
      });
    }
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

  const handleNewMessage = () => {
    fabScale.value = withSequence(
      withSpring(0.9, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('New Message', 'Select a user to start a new conversation');
  };

  const handleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/search');
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
          Connect with people and start meaningful conversations
        </Text>
        <TouchableOpacity style={styles.startChatButton} onPress={handleNewMessage}>
          <LinearGradient
            colors={['#6C5CE7', '#5A4FCF']}
            style={styles.startChatGradient}
          >
            <MessageCircle size={16} color="#FFFFFF" />
            <Text style={styles.startChatText}>Start Chatting</Text>
          </LinearGradient>
        </TouchableOpacity>
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
                <MessageCircle size={28} color="#6C5CE7" />
                <Text style={styles.headerTitle}>Messages</Text>
              </View>
              
              <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                <Search size={24} color="#FFFFFF" />
              </TouchableOpacity>
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
          <Text style={styles.sectionTitle}>Recent</Text>
          
          {conversations.length > 0 ? (
            <ScrollView
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
            >
              {conversations.map((conversation, index) => (
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  searchButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
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
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
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
});