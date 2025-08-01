import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Send, X, Heart } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Comment {
  id: string;
  user: {
    username: string;
    avatar: string;
  };
  text: string;
  likes: number;
  timestamp: string;
  isLiked: boolean;
}

interface ReelCommentsProps {
  visible: boolean;
  onClose: () => void;
  reelId: string;
}

const mockComments: Comment[] = [
  {
    id: '1',
    user: {
      username: 'neon_dreamer',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    text: 'This is absolutely amazing! 🔥',
    likes: 23,
    timestamp: '2h ago',
    isLiked: false,
  },
  {
    id: '2',
    user: {
      username: 'purple_vibes',
      avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    text: 'Love the aesthetic! Where did you get this setup?',
    likes: 12,
    timestamp: '1h ago',
    isLiked: true,
  },
  {
    id: '3',
    user: {
      username: 'cosmic_soul',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    text: 'The vibes are immaculate ✨',
    likes: 8,
    timestamp: '45m ago',
    isLiked: false,
  },
];

export default function ReelComments({ visible, onClose, reelId }: ReelCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');
  const slideUp = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      slideUp.value = withSpring(1);
    } else {
      slideUp.value = withTiming(0);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: (1 - slideUp.value) * SCREEN_HEIGHT * 0.7,
        },
      ],
    };
  });

  const handleSendComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        user: {
          username: 'luna_mystic',
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
        },
        text: newComment.trim(),
        likes: 0,
        timestamp: 'now',
        isLiked: false,
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prevComments =>
      prevComments.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            }
          : comment
      )
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <LinearGradient
            colors={['#1a0a2e', '#16213e', '#0f0518']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Comments</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Image source={{ uri: comment.user.avatar }} style={styles.avatar} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.username}>{comment.user.username}</Text>
                      <Text style={styles.timestamp}>{comment.timestamp}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    <TouchableOpacity
                      style={styles.likeButton}
                      onPress={() => handleLikeComment(comment.id)}
                    >
                      <Heart
                        size={14}
                        color={comment.isLiked ? '#ff6b9d' : '#A0A0A0'}
                        fill={comment.isLiked ? '#ff6b9d' : 'transparent'}
                      />
                      <Text style={[styles.likeText, comment.isLiked && styles.likedText]}>
                        {comment.likes}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.inputContainer}
            >
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#A0A0A0"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, newComment.trim() && styles.sendButtonActive]}
                  onPress={handleSendComment}
                  disabled={!newComment.trim()}
                >
                  <Send size={20} color={newComment.trim() ? '#9B61E5' : '#666666'} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: SCREEN_HEIGHT * 0.7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(155, 97, 229, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginLeft: 4,
  },
  likedText: {
    color: '#ff6b9d',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(155, 97, 229, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(155, 97, 229, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(155, 97, 229, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: 'rgba(155, 97, 229, 0.3)',
  },
});