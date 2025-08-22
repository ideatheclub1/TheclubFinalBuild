import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Send } from 'lucide-react-native';
import ShareToUserModal from './ShareToUserModal';
import { Post, Reel } from '../types';

// Mock data for testing
const mockPost: Post = {
  id: 'test-post-1',
  user: {
    id: 'user-1',
    username: 'testuser',
    avatar: 'https://via.placeholder.com/150',
  },
  content: 'This is a test post for sharing functionality!',
  image: 'https://picsum.photos/400/400',
  likes: 42,
  comments: 8,
  isLiked: false,
  isTrending: false,
  timestamp: new Date().toISOString(),
};

const mockReel: Reel = {
  id: 'test-reel-1',
  user: {
    id: 'user-1',
    username: 'testuser',
    avatar: 'https://via.placeholder.com/150',
  },
  videoUrl: 'https://example.com/video.mp4',
  caption: 'This is a test reel for sharing functionality!',
  hashtags: ['#test', '#share', '#reel'],
  likes: 156,
  comments: 23,
  shares: 12,
  isLiked: false,
  isSaved: false,
  duration: 15000,
  timestamp: new Date().toISOString(),
  thumbnailUrl: 'https://picsum.photos/300/400',
};

export default function ShareTestComponent() {
  const [showPostShare, setShowPostShare] = useState(false);
  const [showReelShare, setShowReelShare] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DM Sharing Test</Text>
      
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => setShowPostShare(true)}
      >
        <Send size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Test Post Sharing</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => setShowReelShare(true)}
      >
        <Send size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Test Reel Sharing</Text>
      </TouchableOpacity>

      <ShareToUserModal
        visible={showPostShare}
        onClose={() => setShowPostShare(false)}
        contentType="post"
        content={mockPost}
        onShareComplete={() => {
          Alert.alert('Success', 'Post shared successfully!');
          setShowPostShare(false);
        }}
      />

      <ShareToUserModal
        visible={showReelShare}
        onClose={() => setShowReelShare(false)}
        contentType="reel"
        content={mockReel}
        onShareComplete={() => {
          Alert.alert('Success', 'Reel shared successfully!');
          setShowReelShare(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


