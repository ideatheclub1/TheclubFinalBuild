import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { X, Heart, MessageCircle, Share2, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import { Post } from '../types';
import { useComments } from '../contexts/CommentContext';
import CommentSystem from './CommentSystem';

interface FullScreenPostViewerProps {
  visible: boolean;
  posts: Post[];
  initialIndex: number;
  onClose: () => void;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
}

const { width, height } = Dimensions.get('window');

export default function FullScreenPostViewer({
  visible,
  posts,
  initialIndex,
  onClose,
  onLike,
  onComment,
}: FullScreenPostViewerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [showComments, setShowComments] = useState(false);
  const { getCommentCount } = useComments();

  const currentPost = posts[currentIndex];

  React.useEffect(() => {
    if (visible && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleClose = () => {
    translateY.value = withTiming(height, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onClose)();
      translateY.value = 0;
      opacity.value = 1;
    });
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {},
    onActive: (event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = Math.max(0.3, 1 - event.translationY / height);
      }
    },
    onEnd: (event) => {
      if (event.translationY > height * 0.3 || event.velocityY > 1000) {
        translateY.value = withTiming(height, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onClose)();
          translateY.value = 0;
          opacity.value = 1;
        });
      } else {
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handleUserPress = (userId: string) => {
    if (userId === '1') {
      Alert.alert(
        'Your Profile',
        'You are viewing your own profile. To make changes, go to your settings.',
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Go to Profile', 
            onPress: () => {
              handleClose();
              router.push('/(tabs)/profile');
            }
          }
        ]
      );
      return;
    }
    handleClose();
    router.push({
      pathname: '/ProfileScreen',
      params: { userId }
    });
  };

  const handleLike = () => {
    onLike(currentPost.id);
  };

  const handleComment = () => {
    setShowComments(true);
  };

  const handleCloseComments = () => {
    setShowComments(false);
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share functionality would be implemented here');
  };

  const handleMore = () => {
    Alert.alert('More Options', 'Additional options would be shown here');
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <View style={styles.postContainer}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      ) : (
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']}
          style={styles.postPlaceholder}
        >
          <Text style={styles.postPlaceholderText}>{item.content}</Text>
        </LinearGradient>
      )}
    </View>
  );

  const onViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  };

  if (!visible || !currentPost) return null;

  const commentCount = getCommentCount(currentPost.id);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <StatusBar hidden />
        <Animated.View style={[styles.backdrop, backgroundStyle]} />
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.container, animatedStyle]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.userInfo}
                onPress={() => handleUserPress(currentPost.user.id)}
              >
                <Image source={{ uri: currentPost.user.avatar }} style={styles.avatar} />
                <Text style={styles.username}>{currentPost.user.username}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <FlatList
              ref={flatListRef}
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />

            {/* Footer */}
            <View style={styles.footer}>
              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <Heart
                    size={28}
                    color={currentPost.isLiked ? '#ff6b9d' : '#FFFFFF'}
                    fill={currentPost.isLiked ? '#ff6b9d' : 'transparent'}
                  />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
                  <MessageCircle size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                  <Share2 size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleMore}>
                  <MoreHorizontal size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Post Info */}
              <View style={styles.postInfo}>
                <Text style={styles.likes}>{currentPost.likes} likes</Text>
                <Text style={styles.content}>
                  <Text style={styles.contentUsername}>{currentPost.user.username}</Text>
                  {' '}
                  <Text style={styles.contentText}>{currentPost.content}</Text>
                </Text>
                <TouchableOpacity onPress={handleComment}>
                  <Text style={styles.viewComments}>
                    {commentCount > 0 ? `View all ${commentCount} comments` : 'Add a comment...'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.timestamp}>{currentPost.timestamp}</Text>
              </View>

              {/* Post Counter */}
              <View style={styles.postCounter}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} of {posts.length}
                </Text>
              </View>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Modal>
      
      {/* Comment System */}
      <CommentSystem
        visible={showComments}
        onClose={handleCloseComments}
        postId={currentPost.id}
        postType="feed"
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#9B61E5',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  postContainer: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: width - 32,
    height: width - 32,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  postPlaceholder: {
    width: width - 32,
    height: width - 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
  },
  postPlaceholderText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButton: {
    marginRight: 20,
    padding: 4,
  },
  postInfo: {
    paddingVertical: 8,
  },
  likes: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  contentUsername: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentText: {
    color: '#FFFFFF',
  },
  viewComments: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#A0A0A0',
    opacity: 0.8,
  },
  postCounter: {
    alignItems: 'center',
    paddingTop: 8,
  },
  counterText: {
    fontSize: 12,
    color: '#A0A0A0',
    opacity: 0.8,
  },
});