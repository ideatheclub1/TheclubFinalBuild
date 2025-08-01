import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Send, X, Heart, MessageCircle, MoveHorizontal as MoreHorizontal, CreditCard as Edit3, Trash2, Reply, ChevronRight } from 'lucide-react-native';
import { useComments } from '../contexts/CommentContext';
import { Comment } from '../types/comments';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentSystemProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postType: 'feed' | 'reel';
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const CommentItem: React.FC<{
  comment: Comment;
  onLike: (commentId: string) => void;
  onReply: (comment: Comment) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  currentUserId: string;
  isReply?: boolean;
}> = ({ comment, onLike, onReply, onEdit, onDelete, currentUserId, isReply = false }) => {
  const router = useRouter();
  const likeScale = useSharedValue(1);
  const [showActions, setShowActions] = useState(false);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeScale.value = withSpring(1.2, {}, () => {
      likeScale.value = withSpring(1);
    });
    onLike(comment.id);
  };

  const handleUserPress = () => {
    if (comment.user.id === currentUserId) {
      Alert.alert(
        'Your Profile',
        'You are viewing your own profile.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
    } else {
      router.push({
        pathname: '/ProfileScreen',
        params: { userId: comment.user.id }
      });
    }
  };

  const handleMoreOptions = () => {
    setShowActions(!showActions);
  };

  const handleEdit = () => {
    setShowActions(false);
    onEdit(comment);
  };

  const handleDelete = () => {
    setShowActions(false);
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) }
      ]
    );
  };

  const handleReply = () => {
    setShowActions(false);
    onReply(comment);
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const isOwner = comment.userId === currentUserId;

  return (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      <TouchableOpacity onPress={handleUserPress}>
        <Image source={{ uri: comment.user.avatar }} style={styles.commentAvatar} />
      </TouchableOpacity>
      
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <TouchableOpacity onPress={handleUserPress}>
            <Text style={styles.commentUsername}>{comment.user.username}</Text>
          </TouchableOpacity>
          <Text style={styles.commentText}>{comment.content}</Text>
          {comment.isEdited && (
            <Text style={styles.editedText}>edited</Text>
          )}
        </View>
        
        <View style={styles.commentActions}>
          <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
          
          <AnimatedTouchableOpacity
            style={[styles.commentAction, likeAnimatedStyle]}
            onPress={handleLike}
          >
            <Heart
              size={12}
              color={comment.isLiked ? '#ff6b9d' : '#A0A0A0'}
              fill={comment.isLiked ? '#ff6b9d' : 'transparent'}
            />
            <Text style={[styles.commentActionText, comment.isLiked && styles.likedText]}>
              {comment.likes > 0 ? comment.likes : 'Like'}
            </Text>
          </AnimatedTouchableOpacity>
          
          {!isReply && (
            <TouchableOpacity style={styles.commentAction} onPress={handleReply}>
              <Reply size={12} color="#A0A0A0" />
              <Text style={styles.commentActionText}>Reply</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.commentAction} onPress={handleMoreOptions}>
            <MoreHorizontal size={12} color="#A0A0A0" />
          </TouchableOpacity>
        </View>
        
        {showActions && (
          <View style={styles.actionMenu}>
            {isOwner && (
              <>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleEdit}>
                  <Edit3 size={16} color="#9B61E5" />
                  <Text style={styles.actionMenuText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleDelete}>
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={[styles.actionMenuText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
            {!isOwner && (
              <TouchableOpacity style={styles.actionMenuItem}>
                <Text style={styles.actionMenuText}>Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                currentUserId={currentUserId}
                isReply={true}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default function CommentSystem({ visible, onClose, postId, postType }: CommentSystemProps) {
  const {
    getComments,
    getCommentCount,
    addComment,
    likeComment,
    deleteComment,
    editComment,
    loading
  } = useComments();
  
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const slideUp = useSharedValue(0);

  const comments = getComments(postId);
  const commentCount = getCommentCount(postId);
  const currentUserId = '1'; // Current user ID (luna_mystic)

  useEffect(() => {
    if (visible) {
      slideUp.value = withSpring(1);
    } else {
      slideUp.value = withTiming(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: (1 - slideUp.value) * SCREEN_HEIGHT * 0.8,
        },
      ],
    };
  });

  const handleSendComment = async () => {
    if (newComment.trim()) {
      try {
        await addComment(postId, postType, newComment, replyTo?.id);
        setNewComment('');
        setReplyTo(null);
        
        // Scroll to top to show new comment
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        Alert.alert('Error', 'Failed to add comment');
      }
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await likeComment(postId, commentId);
    } catch (error) {
      Alert.alert('Error', 'Failed to like comment');
    }
  };

  const handleReplyToComment = (comment: Comment) => {
    setReplyTo(comment);
    setNewComment(`@${comment.user.username} `);
    textInputRef.current?.focus();
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditText(comment.content);
  };

  const handleSaveEdit = async () => {
    if (editingComment && editText.trim()) {
      try {
        await editComment(postId, editingComment.id, editText);
        setEditingComment(null);
        setEditText('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        Alert.alert('Error', 'Failed to edit comment');
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(postId, commentId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete comment');
    }
  };

  const handleClose = () => {
    setReplyTo(null);
    setEditingComment(null);
    setNewComment('');
    setEditText('');
    onClose();
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentItem
      comment={item}
      onLike={handleLikeComment}
      onReply={handleReplyToComment}
      onEdit={handleEditComment}
      onDelete={handleDeleteComment}
      currentUserId={currentUserId}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MessageCircle size={48} color="#A0A0A0" />
      <Text style={styles.emptyStateText}>No comments yet</Text>
      <Text style={styles.emptyStateSubtext}>Be the first to comment!</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <LinearGradient
            colors={['#1a0a2e', '#16213e', '#0f0518']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                Comments ({commentCount})
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Edit Comment Modal */}
            {editingComment && (
              <View style={styles.editModal}>
                <Text style={styles.editModalTitle}>Edit Comment</Text>
                <TextInput
                  style={styles.editTextInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  maxLength={2000}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editCancelButton}
                    onPress={() => setEditingComment(null)}
                  >
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editSaveButton}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.editSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Comments List */}
            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              style={styles.commentsList}
              contentContainerStyle={styles.commentsContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              keyboardShouldPersistTaps="handled"
            />

            {/* Reply To Indicator */}
            {replyTo && (
              <View style={styles.replyIndicator}>
                <Text style={styles.replyText}>
                  Replying to @{replyTo.user.username}
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <X size={16} color="#A0A0A0" />
                </TouchableOpacity>
              </View>
            )}

            {/* Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.inputContainer}
            >
              <View style={styles.inputRow}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder={replyTo ? `Reply to @${replyTo.user.username}...` : 'Add a comment...'}
                  placeholderTextColor="#A0A0A0"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={2000}
                />
                <TouchableOpacity
                  style={[styles.sendButton, newComment.trim() && styles.sendButtonActive]}
                  onPress={handleSendComment}
                  disabled={!newComment.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#9B61E5" />
                  ) : (
                    <Send size={20} color={newComment.trim() ? '#9B61E5' : '#666666'} />
                  )}
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
    height: SCREEN_HEIGHT * 0.8,
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
  },
  commentsContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  replyItem: {
    marginLeft: 32,
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  editedText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 4,
    fontStyle: 'italic',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '600',
  },
  likedText: {
    color: '#ff6b9d',
  },
  actionMenu: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  actionMenuText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(155, 97, 229, 0.3)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  editModal: {
    backgroundColor: 'rgba(26, 10, 46, 0.95)',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(155, 97, 229, 0.3)',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  editTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editCancelText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: '600',
  },
  editSaveButton: {
    backgroundColor: '#9B61E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(155, 97, 229, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(155, 97, 229, 0.3)',
  },
  replyText: {
    fontSize: 14,
    color: '#9B61E5',
    fontWeight: '600',
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
    gap: 12,
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