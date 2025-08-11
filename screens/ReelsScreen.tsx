import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
  RefreshControl,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Play, RefreshCw } from 'lucide-react-native';
import ReelItem from '../components/ReelItem';
import { Reel } from '../data/mockReels';
import { useDebugLogger, debug } from '@/utils/debugLogger';
import { reelService } from '../services/dataService';
import { useUser } from '@/contexts/UserContext';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Get the actual viewable height accounting for safe areas
const getViewableHeight = (insets: any) => {
  if (Platform.OS === 'ios') {
    // On iOS, subtract safe area insets for proper full-screen experience
    return SCREEN_HEIGHT - insets.top - insets.bottom;
  }
  return SCREEN_HEIGHT;
};

export default function ReelsScreen() {
  const debugLogger = useDebugLogger('ReelsScreen');
  const { user: currentUser } = useUser();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  // Calculate the proper item height for iOS
  const itemHeight = useMemo(() => getViewableHeight(insets), [insets]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const reelsRef = useRef<Reel[]>([]);
  const currentIndexRef = useRef(0);

  // Get hashtags and startReelId from route params (passed from trending screen)
  const routeParams = route.params as any;
  const hashtagsParam = routeParams?.hashtags;
  const startReelId = routeParams?.startReelId;
  const hashtagsToFilter = hashtagsParam ? JSON.parse(hashtagsParam) : null;

  // Load reels from backend
  const loadReels = useCallback(async () => {
    try {
      debug.dbQuery('reels', 'LOAD', { hashtagsToFilter });
      setIsLoading(true);
      
      let reelsData: Reel[];
      if (hashtagsToFilter && hashtagsToFilter.length > 0) {
        // Load reels filtered by hashtags
        reelsData = await reelService.getReelsByHashtags(hashtagsToFilter, 20, 0);
        debug.dbSuccess('reels', 'HASHTAG_LOAD', { count: reelsData.length, hashtags: hashtagsToFilter });
      } else {
        // Load regular reels
        reelsData = await reelService.getReels(20, 0);
        debug.dbSuccess('reels', 'LOAD', { count: reelsData.length });
      }
      
      setReels(reelsData);
      reelsRef.current = reelsData; // Update the ref

      // If startReelId is provided, find and scroll to that reel
      if (startReelId && reelsData.length > 0) {
        const startIndex = reelsData.findIndex(reel => reel.id === startReelId);
        if (startIndex !== -1) {
          setCurrentIndex(startIndex);
          currentIndexRef.current = startIndex;
          // Scroll to the specific reel after a short delay
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: startIndex, animated: false });
          }, 100);
        }
      }
    } catch (error) {
      debug.dbError('reels', 'LOAD', { error: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [hashtagsToFilter, startReelId]);

  // Load reels on mount
  useEffect(() => {
    loadReels();
  }, [loadReels]);

  // Pause videos when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // This runs when the screen loses focus
        debug.userAction('Reels screen lost focus - pausing videos');
      };
    }, [])
  );

  // Update ref when currentIndex changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Reels screen loaded', { reelsCount: reels.length });
  }, [reels.length]);

  const handleLike = useCallback(async (reelId: string) => {
    debug.userAction('Like reel', { reelId });
    try {
      const isLiked = await reelService.toggleLike(reelId);
      setReels(prevReels => {
        const updatedReels = prevReels.map(reel => {
          if (reel.id === reelId) {
            debug.userAction('Reel like state changed', { 
              reelId, 
              newLikeState: isLiked, 
              newLikesCount: isLiked ? reel.likes + 1 : reel.likes - 1 
            });
            return {
              ...reel,
              isLiked,
              likes: isLiked ? reel.likes + 1 : reel.likes - 1,
            };
          }
          return reel;
        });
        reelsRef.current = updatedReels; // Update the ref
        return updatedReels;
      });
    } catch (error) {
      debug.dbError('reel_like', 'TOGGLE', { error: (error as Error).message });
    }
  }, []);

  const handleSave = useCallback(async (reelId: string) => {
    debug.userAction('Save reel', { reelId });
    try {
      const isSaved = await reelService.toggleSave(reelId);
      setReels(prevReels => {
        const updatedReels = prevReels.map(reel => {
          if (reel.id === reelId) {
            debug.userAction('Reel save state changed', { reelId, newSaveState: isSaved });
            return {
              ...reel,
              isSaved,
            };
          }
          return reel;
        });
        reelsRef.current = updatedReels; // Update the ref
        return updatedReels;
      });
    } catch (error) {
      debug.dbError('reel_save', 'TOGGLE', { error: (error as Error).message });
    }
  }, []);

  const handleComment = useCallback((reelId: string) => {
    debug.userAction('Open comments', { reelId });
    Alert.alert('Comments', `Opening comments for reel ${reelId}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Comments', onPress: () => {
        debug.userAction('Comments opened', { reelId });
        console.log('Open comments');
      }},
    ]);
  }, []);

  const handleShare = useCallback(async (reelId: string) => {
    debug.userAction('Share reel', { reelId });
    try {
      const success = await reelService.shareReel(reelId, 'internal');
      if (success) {
        debug.userAction('Reel shared successfully', { reelId });
        Alert.alert('Shared!', 'Reel has been shared to your story');
      } else {
        Alert.alert('Error', 'Failed to share reel');
      }
    } catch (error) {
      debug.dbError('reel_share', 'CREATE', { error: (error as Error).message });
      Alert.alert('Error', 'Failed to share reel');
    }
  }, []);

  const handleDeleteReel = useCallback((reelId: string, reelUsername: string) => {
    debug.userAction('Delete reel pressed', { reelId });
    
    if (!currentUser) {
      debug.userAction('No current user, skipping delete action');
      return;
    }

    Alert.alert(
      '🎬 Delete Reel',
      `Are you sure you want to delete this reel?\n\nThis action cannot be undone and will permanently remove the reel and all associated comments, likes, and shares.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => debug.userAction('Delete reel cancelled', { reelId })
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              debug.userAction('Confirming delete reel', { reelId, userId: currentUser.id });
              
              const success = await reelService.deleteReel(reelId, currentUser.id);
              if (success) {
                debug.userAction('Reel deleted successfully', { reelId });
                // Remove reel from local state
                setReels(prevReels => prevReels.filter(reel => reel.id !== reelId));
                reelsRef.current = reelsRef.current.filter(reel => reel.id !== reelId);
                
                // Adjust current index if needed
                if (currentIndexRef.current > 0 && currentIndexRef.current >= reelsRef.current.length) {
                  const newIndex = Math.max(0, reelsRef.current.length - 1);
                  setCurrentIndex(newIndex);
                  currentIndexRef.current = newIndex;
                }
                
                Alert.alert(
                  '✅ Success', 
                  'Reel has been deleted successfully!',
                  [{ text: 'OK', style: 'default' }]
                );
              } else {
                debug.userAction('Failed to delete reel', { reelId });
                Alert.alert(
                  '❌ Error', 
                  'Failed to delete reel. Please check your connection and try again.',
                  [{ text: 'OK', style: 'default' }]
                );
              }
            } catch (error) {
              debug.dbError('reel', 'DELETE', { error: (error as Error).message });
              Alert.alert(
                '❌ Error', 
                'An unexpected error occurred while deleting the reel. Please try again.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          }
        }
      ],
      { cancelable: true }
    );
  }, [currentUser]);

  const handleRefresh = useCallback(async () => {
    debug.userAction('Refresh reels', { currentReelsCount: reels.length });
    setIsRefreshing(true);
    try {
      await loadReels();
      debug.userAction('Reels refreshed', { newReelsCount: reels.length });
    } catch (error) {
      debug.dbError('reels', 'REFRESH', { error: (error as Error).message });
    } finally {
      setIsRefreshing(false);
    }
  }, [reels.length, loadReels]);

  // Create stable references for FlatList props to prevent re-render issues
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
  });

  const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      const previousIndex = currentIndexRef.current;
      
      debug.userAction('Reel view changed', { 
        previousIndex, 
        newIndex
      });
      
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      
      // Increment view count for the viewed reel using ref to avoid dependency issues
      const reelId = reelsRef.current[newIndex]?.id;
      if (reelId) {
        reelService.incrementView(reelId).catch(error => {
          debug.dbError('reel_view', 'INCREMENT', { error: (error as Error).message });
        });
      }
    }
  });

  const renderReel = useCallback(({ item, index }: { item: Reel; index: number }) => (
    <ReelItem
      reel={item}
      isActive={index === currentIndex}
      onLike={handleLike}
      onSave={handleSave}
      onComment={handleComment}
      onShare={handleShare}
      onDelete={handleDeleteReel}
    />
  ), [currentIndex, handleLike, handleSave, handleComment, handleShare, handleDeleteReel]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['rgba(108, 92, 231, 0.1)', 'rgba(108, 92, 231, 0.05)']}
        style={styles.emptyGradient}
      >
        <Play size={64} color="#6C5CE7" />
        <Text style={styles.emptyTitle}>No Reels Available</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to create a reel and share your story!
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <RefreshCw size={20} color="#6C5CE7" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.container} backgroundColor="#1E1E1E">
        <StatusBar style="light" backgroundColor="#1E1E1E" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (reels.length === 0) {
    return (
      <SafeAreaWrapper style={styles.container} backgroundColor="#1E1E1E">
        <StatusBar style="light" backgroundColor="#1E1E1E" />
        {renderEmptyState()}
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={styles.container} backgroundColor="#1E1E1E">
      <StatusBar style="light" backgroundColor="#1E1E1E" />
      
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
            progressBackgroundColor="#1E1E1E"
          />
        }
        getItemLayout={(data, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
        style={[
          styles.flatList,
          Platform.OS === 'ios' && {
            marginTop: -insets.top,
            paddingTop: insets.top,
          }
        ]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
              />
      </SafeAreaWrapper>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  flatList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyGradient: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '600',
    marginLeft: 8,
  },
});