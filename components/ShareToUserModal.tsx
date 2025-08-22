import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X, Search, Send } from 'lucide-react-native';
import CachedImage from './CachedImage';
import { dataService } from '../services/dataService';
import { useUser } from '@/contexts/UserContext';


interface User {
  id: string;
  username: string;
  avatar: string;
}

interface ShareToUserModalProps {
  visible: boolean;
  onClose: () => void;
  sharedPost?: any;
  sharedReel?: any;
  sharedStory?: any;
}

const ShareToUserModal: React.FC<ShareToUserModalProps> = ({
  visible,
  onClose,
  sharedPost,
  sharedReel,
  sharedStory,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user: currentUser } = useUser();

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Get users from conversations
      const conversations = await dataService.message.getConversations(currentUser?.id || '');
      const userList = conversations
        .map(conv => conv.participants.find(p => p.id !== currentUser?.id))
        .filter(Boolean)
        .slice(0, 20); // Limit to 20 users
      
      setUsers(userList as User[]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (userId: string) => {
    try {
      console.error('🚨🚨🚨 SHAREMODAL - Starting share with:', { userId, sharedPost, sharedReel });
      setSending(userId);
      
      // Create conversation if it doesn't exist
      const conversationId = await dataService.message.createConversation([currentUser?.id || '', userId]);
      
      if (!conversationId) {
        throw new Error('Failed to create conversation');
      }
      
      // Send the shared content message
      let content: string;
      let messageType: string;
      
      if (sharedPost) {
        content = 'Shared a post with you';
        messageType = 'post';
      } else if (sharedReel) {
        content = 'Shared a reel with you';
        messageType = 'reel';
      } else if (sharedStory) {
        content = 'Shared a story with you';
        messageType = 'story';
      } else {
        throw new Error('No content to share');
      }
      
      console.error('🚨🚨🚨 SHAREMODAL - About to call sendMessage with:', {
        conversationId,
        senderId: currentUser?.id,
        content,
        messageType,
        sharedPost,
        sharedReel,
        sharedStory
      });
      
      const message = await dataService.message.sendMessage(
        conversationId,
        currentUser?.id || '',
        content,
        messageType,
        sharedPost,
        sharedReel,
        sharedStory
      );

      if (message) {
        setMessage({ type: 'success', text: 'Content shared successfully!' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setMessage({ type: 'error', text: 'Failed to share content. Please try again.' });
    } finally {
      setSending(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleShare(user.id)}
      disabled={sending === user.id}
    >
      <CachedImage
        source={{ uri: user.avatar }}
        style={styles.avatar}
        cacheType="thumbnail"
        showLoader={false}
      />
      <Text style={styles.username}>{user.username}</Text>
      {sending === user.id ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <Send size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Share to</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>

        {/* Message Display */}
        {message && (
          <View style={[
            styles.messageContainer,
            { backgroundColor: message.type === 'success' ? '#4CAF50' : '#F44336' }
          ]}>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            style={styles.userList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  messageContainer: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ShareToUserModal;


