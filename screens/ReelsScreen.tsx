import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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
import { mockReels, Reel } from '../data/mockReels';
import { useDebugLogger, debug } from '@/utils/debugLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReelsScreen() {
  const debugLogger = useDebugLogger('ReelsScreen');
  const [reels, setReels] = useState<Reel[]>(mockReels);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Reels screen loaded', { reelsCount: reels.length });
  }, []);

  const handleLike = useCallback((reelId: string) => {
    debug.userAction('Like reel', { reelId });
    setReels(prevReels =>
      prevReels.map(reel => {
        if (reel.id === reelId) {
          const newLikeState = !reel.isLiked;
          debug.userAction('Reel like state changed', { 
            reelId, 
            newLikeState, 
            newLikesCount: newLikeState ? reel.likes + 1 : reel.likes - 1 
          });
          return {
            ...reel,
            isLiked: newLikeState,
            likes: newLikeState ? reel.likes + 1 : reel.likes - 1,
          };
        }
        return reel;
      })
    );
  }, []);

  const handleSave = useCallback((reelId: string) => {
    debug.userAction('Save reel', { reelId });
    setReels(prevReels =>
      prevReels.map(reel => {
        if (reel.id === reelId) {
          const newSaveState = !reel.isSaved;
          debug.userAction('Reel save state changed', { reelId, newSaveState });
          return {
            ...reel,
            isSaved: newSaveState,
          };
        }
        return reel;
      })
    );
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

  const handleShare = useCallback((reelId: string) => {
    debug.userAction('Share reel', { reelId });
    Alert.alert('Share', `Sharing reel ${reelId}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: () => {
        debug.userAction('Reel shared', { reelId });
        console.log('Share reel');
      }},
    ]);
  }, []);

  const handleRefresh = useCallback(() => {
    debug.userAction('Refresh reels', { currentReelsCount: reels.length });
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
      debug.userAction('Reels refreshed', { newReelsCount: reels.length });
      Alert.alert('Refreshed', 'New reels loaded!');
    }, 1000);
  }, [reels.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      debug.userAction('Reel view changed', { 
        previousIndex: currentIndex, 
        newIndex, 
        reelId: reels[newIndex]?.id 
      });
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, reels]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderReel = ({ item, index }: { item: Reel; index: number }) => (
    <ReelItem
      reel={item}
      isActive={index === currentIndex}
      onLike={handleLike}
      onSave={handleSave}
      onComment={handleComment}
      onShare={handleShare}
    />
  );

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

  if (reels.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor="#1E1E1E" />
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" backgroundColor="#1E1E1E" />
      
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
            progressBackgroundColor="#1E1E1E"
          />
        }
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
        style={styles.flatList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
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