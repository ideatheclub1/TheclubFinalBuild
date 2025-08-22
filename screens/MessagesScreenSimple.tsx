import React, { useState, useEffect } from 'react';
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
  RefreshControl,
  TextInput,
} from 'react-native';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { useRouter } from 'expo-router';
import { MessageCircle, Search, Plus } from 'lucide-react-native';
import { Conversation, User } from '../types';
import { useUser } from '@/contexts/UserContext';
import { useDebugLogger } from '@/utils/debugLogger';
import { useMessaging } from '@/hooks/useMessagingBroadcast';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import DatabaseConnectionTest from '@/components/DatabaseConnectionTest';

const { width, height } = Dimensions.get('window');

interface MessageCardProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
  onLongPress?: (conversation: Conversation) => void;
}

const MessageCard = ({ conversation, onPress, onLongPress }: MessageCardProps) => {
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onPress(conversation);
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(conversation);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.messageCard,
        pressed && styles.messageCardPressed
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ 
            uri: conversation.participants?.[0]?.avatar || conversation.participants?.[0]?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=faces'
          }}
          style={styles.avatar}
        />
        {conversation.participants?.[0]?.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {conversation.participants?.[0]?.username || conversation.participants?.[0]?.fullName || 'Unknown User'}
          </Text>
          <Text style={styles.timestamp}>
            {conversation.lastMessage?.timestamp ? 
              new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
              ''
            }
          </Text>
        </View>
        
        <View style={styles.lastMessageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.lastMessage?.content || 'No messages yet'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function MessagesScreen() {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const debugLogger = useDebugLogger('MessagesScreen');
  
  const { conversations, loading, error, isConnected, networkStatus, supabaseConnected, loadConversations } = useMessaging();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const title = conv.participants?.[0]?.username?.toLowerCase() || conv.participants?.[0]?.fullName?.toLowerCase() || '';
    const participantNames = conv.participants?.map(p => p.username?.toLowerCase() || '').join(' ') || '';
    const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';
    
    return title.includes(searchLower) || 
           participantNames.includes(searchLower) || 
           lastMessage.includes(searchLower);
  });

  const handleConversationPress = (conversation: Conversation) => {
    debugLogger.info('CONVERSATION_PRESS', `Opening conversation: ${conversation.id}`);
    
    router.push({
      pathname: '/conversation',
      params: { 
        conversationId: conversation.id,
        userId: conversation.participants?.[0]?.id || '',
                    userName: conversation.participants?.[0]?.username || conversation.participants?.[0]?.fullName || 'Chat'
      }
    });
  };

  const handleConversationLongPress = (conversation: Conversation) => {
    Alert.alert(
      'Conversation Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Read', onPress: () => handleMarkAsRead(conversation) },
        { text: 'Archive', onPress: () => handleArchive(conversation) },
      ]
    );
  };

  const handleMarkAsRead = (conversation: Conversation) => {
    // Implementation for marking as read
    debugLogger.info('MARK_AS_READ', `Marking conversation as read: ${conversation.id}`);
  };

  const handleArchive = (conversation: Conversation) => {
    Alert.alert(
      'Archive Conversation',
      `Are you sure you want to archive this conversation with ${conversation.participants?.[0]?.username || conversation.participants?.[0]?.fullName || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => {
          debugLogger.info('ARCHIVE', `Archiving conversation: ${conversation.id}`);
          // Implementation for archiving
        }}
      ]
    );
  };

  const handleNewMessage = () => {
    debugLogger.info('NEW_MESSAGE', 'Opening new message screen');
    router.push('/search?mode=message');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadConversations();
    } catch (err) {
      debugLogger.info('REFRESH_ERROR', 'Failed to refresh conversations', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    debugLogger.info('SEARCH', `Searching conversations: ${text}`);
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity 
              style={styles.newMessageButton}
              onPress={handleNewMessage}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
            

          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#666666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        {/* Connection Status */}
        <ConnectionStatusIndicator
          isConnected={isConnected}
          networkStatus={networkStatus}
          supabaseConnected={supabaseConnected}
          onRetry={() => {
            // Force refresh conversations and check connection
            loadConversations();
          }}
          showDetails={true}
        />

        {/* Database Connection Test - Only in development */}
        {__DEV__ && (
          <DatabaseConnectionTest />
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Messages List */}
        <ScrollView
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6C5CE7"
              colors={['#6C5CE7']}
            />
          }
        >
          {loading && conversations.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MessageCircle size={48} color="#666666" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try searching with different keywords'
                  : 'Start a conversation by tapping the + button'
                }
              </Text>
            </View>
          ) : (
            filteredConversations.map((conversation) => (
              <MessageCard
                key={conversation.id}
                conversation={conversation}
                onPress={handleConversationPress}
                onLongPress={handleConversationLongPress}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    backgroundColor: '#2A2A2A',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newMessageButton: {
    backgroundColor: '#6C5CE7',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3A',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#666666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  messageCardPressed: {
    backgroundColor: '#2A2A2A',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3A3A3A',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00D2FF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  messageContent: {
    flex: 1,
    justifyContent: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#999999',
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
