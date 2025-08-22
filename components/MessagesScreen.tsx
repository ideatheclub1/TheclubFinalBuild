import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, MessageCircle, Search, CreditCard as Edit, Heart, Clock } from 'lucide-react-native';
import { mockConversations, mockUsers } from '../data/mockData';
import { Conversation, User } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MessagesScreenProps {
  isVisible: boolean;
  onClose: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function MessagesScreen({ isVisible, onClose }: MessagesScreenProps) {
  console.log('❌ WRONG MessagesScreen component loaded! (This uses mock data and should NOT be used)');
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [onlineUsers, setOnlineUsers] = useState<User[]>(mockUsers.slice(0, 6));
  
  const panelOpacity = useSharedValue(0);
  const headerGlow = useSharedValue(0);
  const chatBubbleScale = useSharedValue(1);

  useEffect(() => {
    if (isVisible) {
      panelOpacity.value = withSpring(1, { damping: 15 });
      // Animated chat bubble icon
      chatBubbleScale.value = withRepeat(
        withSequence(
          withSpring(1.1, { damping: 8 }),
          withSpring(1, { damping: 8 })
        ),
        3,
        false
      );
    } else {
      panelOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible]);

  useEffect(() => {
    // Header glow animation
    headerGlow.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    triggerHaptic();
    const otherUser = conversation.participants.find(p => p.id !== '1');
    if (otherUser) {
      onClose();
      router.push({
        pathname: '/conversation',
        params: { userId: otherUser.id, userName: otherUser.username }
      });
    }
  };

  const handleUserPress = (user: User) => {
    triggerHaptic();
    onClose();
    router.push({
      pathname: '/ProfileScreen',
      params: { userId: user.id }
    });
  };

  const handleNewMessage = () => {
    triggerHaptic();
    onClose();
    router.push('/(tabs)/messages');
  };

  const panelStyle = useAnimatedStyle(() => {
    return {
      opacity: panelOpacity.value,
    };
  });

  const headerGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(headerGlow.value, [0, 1], [0.3, 0.8]),
      shadowRadius: interpolate(headerGlow.value, [0, 1], [10, 20]),
    };
  });

  const chatBubbleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: chatBubbleScale.value }],
    };
  });

  const renderOnlineUser = ({ item, index }: { item: User; index: number }) => (
    <AnimatedTouchableOpacity
      style={styles.onlineUserContainer}
      onPress={() => handleUserPress(item)}
      entering={SlideInRight.delay(index * 50)}
    >
      <View style={styles.onlineUserImageContainer}>
        <Image source={{ uri: item.avatar }} style={styles.onlineUserImage} />
        <View style={styles.onlineIndicator} />
      </View>
      <Text style={styles.onlineUserName} numberOfLines={1}>
        {item.username}
      </Text>
    </AnimatedTouchableOpacity>
  );

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const otherUser = item.participants.find(p => p.id !== '1');
    if (!otherUser) return null;

    return (
      <AnimatedTouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        entering={FadeIn.delay(index * 100)}
      >
        <View style={styles.conversationImageContainer}>
          <Image source={{ uri: otherUser.avatar }} style={styles.conversationImage} />
          {item.unreadCount > 0 && (
            <View style={styles.unreadDot} />
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {otherUser.username}
            </Text>
            <View style={styles.timestampContainer}>
              <Clock size={12} color="#B0B0B0" />
              <Text style={styles.conversationTime}>
                {item.lastMessage.timestamp}
              </Text>
            </View>
          </View>
          
          <Text style={styles.conversationMessage} numberOfLines={2}>
            {item.lastMessage.content}
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

  const renderHeader = () => (
    <Animated.View entering={FadeIn.delay(200)}>
      <Animated.View style={[styles.header, headerGlowStyle]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.iconContainer, chatBubbleStyle]}>
              <MessageCircle size={24} color="#6C5CE7" />
            </Animated.View>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Search size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.headerButton} onPress={handleNewMessage}>
              <Edit size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );

  const renderOnlineSection = () => (
    <Animated.View entering={FadeIn.delay(300)}>
      <View style={styles.onlineSection}>
        <Text style={styles.sectionTitle}>Active Now</Text>
        <FlatList
          data={onlineUsers}
          renderItem={renderOnlineUser}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.onlineList}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>
    </Animated.View>
  );

  const renderEmptyMessages = () => (
    <Animated.View entering={FadeIn.delay(500)}>
      <View style={styles.emptyContainer}>
        <Heart size={48} color="#6C5CE7" />
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

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, panelStyle]}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 0} style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(30, 30, 30, 0.95)', 'rgba(42, 42, 42, 0.95)']}
          style={styles.gradient}
        >
          {renderHeader()}
          
          {renderOnlineSection()}
          
          {/* Conversations List */}
          <View style={styles.conversationsSection}>
            <Text style={styles.sectionTitle}>Recent</Text>
            
            {conversations.length > 0 ? (
              <FlatList
                data={conversations}
                renderItem={renderConversation}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.conversationsList}
              />
            ) : (
              renderEmptyMessages()
            )}
          </View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'android' ? 'rgba(30, 30, 30, 0.95)' : 'transparent',
  },
  gradient: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 92, 231, 0.2)',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  onlineSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  onlineList: {
    paddingHorizontal: 20,
  },
  onlineUserContainer: {
    alignItems: 'center',
    width: 70,
  },
  onlineUserImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  onlineUserImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00D46A',
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  onlineUserName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  conversationsSection: {
    flex: 1,
    paddingTop: 10,
  },
  conversationsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.1)',
  },
  conversationImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  conversationImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6C5CE7',
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conversationTime: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  conversationMessage: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 18,
  },
  unreadBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyContainer: {
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
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startChatButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
  },
});