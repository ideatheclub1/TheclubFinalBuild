import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { mockConversations } from '../data/mockData';
import { Conversation } from '../types';

export default function ConversationsListScreen() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const router = useRouter();

  const handleConversationPress = (conversation: Conversation) => {
    const otherUser = conversation.participants.find(p => p.id !== '1'); // Assuming '1' is current user
    if (otherUser) {
      router.push({
        pathname: '/conversations',
        params: { userId: otherUser.id, username: otherUser.username }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0f0518', '#1a0a2e', '#16213e']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <MessageCircle size={28} color="#e0aaff" />
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {conversations.length > 0 ? (
            conversations.map(conversation => {
              const otherUser = conversation.participants.find(p => p.id !== '1');
              if (!otherUser) return null;

              return (
                <TouchableOpacity
                  key={conversation.id}
                  onPress={() => handleConversationPress(conversation)}
                >
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
                    style={styles.conversationCard}
                  >
                    <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                    <View style={styles.conversationInfo}>
                      <Text style={styles.username}>{otherUser.username}</Text>
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {conversation.lastMessage.content}
                      </Text>
                    </View>
                    <View style={styles.conversationMeta}>
                      <Text style={styles.timestamp}>{conversation.lastMessage.timestamp}</Text>
                      {conversation.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation with someone!</Text>
            </View>
          )}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e0aaff',
    marginLeft: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0aaff',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#a855f7',
    opacity: 0.8,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#a855f7',
    opacity: 0.6,
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#ff6b9d',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#e0aaff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a855f7',
    opacity: 0.8,
  },
});