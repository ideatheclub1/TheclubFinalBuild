import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  Modal,
  Dimensions,
  StatusBar,
  Platform,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Flame, ListFilter as Filter, Heart, X, Play, Eye, Clock } from 'lucide-react-native';
import { useDebugLogger, debug } from '@/utils/debugLogger';
import { reelService } from '../services/dataService';
import { Reel } from '../types';

const { width } = Dimensions.get('window');

// Calculate masonry item dimensions
const PADDING = 8;
const COLUMNS = 2;
const ITEM_WIDTH = (width - (COLUMNS + 1) * PADDING) / COLUMNS;

const genres = [
  'All', 'Fitness', 'Music', 'AI', 'Crypto', 'Coding', 
  'Gaming', 'Film', 'Fashion', 'Art', 'Travel', 'Tech'
];

const contentTypes = ['All', 'Image', 'Reel', 'Video', 'AI-generated'];
const dateFilters = ['Today', 'Week', 'Month', 'All Time'];
const regions = ['Global', 'Local', 'North America', 'Europe', 'Asia'];
const trendingStyles = ['Likes', 'Shares', 'Velocity', 'Comments'];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface TrendingReel extends Reel {
  aspectRatio: number; // For masonry layout
  genre: string;
}

// Helper function to convert reels to trending format
const convertReelToTrending = (reel: Reel): TrendingReel => ({
  ...reel,
  aspectRatio: 0.8 + (Math.random() * 1.2), // Random between 0.8 and 2.0 for masonry layout
  genre: getGenreFromHashtags(reel.hashtags || []),
  views: reel.viewCount || 0,
});

// Helper function to extract genre from hashtags
const getGenreFromHashtags = (hashtags: string[]): string => {
  const genreMap: { [key: string]: string } = {
    fitness: 'Fitness',
    music: 'Music',
    ai: 'AI',
    crypto: 'Crypto',
    coding: 'Coding',
    gaming: 'Gaming',
    film: 'Film',
    fashion: 'Fashion',
    art: 'Art',
    travel: 'Travel',
    tech: 'Tech',
  };

  for (const hashtag of hashtags) {
    const cleanTag = hashtag.replace('#', '').toLowerCase();
    if (genreMap[cleanTag]) {
      return genreMap[cleanTag];
    }
  }
  
  return 'All'; // Default genre
};

export default function TrendingScreen() {
  const debugLogger = useDebugLogger('TrendingScreen');
  const router = useRouter();
  const [trendingReels, setTrendingReels] = useState<TrendingReel[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    contentType: 'Reel',
    date: 'Today',
    region: 'Global',
    trendingStyle: 'Likes',
  });

  // Load trending reels from backend
  const loadTrendingReels = useCallback(async () => {
    try {
      setIsLoading(true);
      debug.dbQuery('trending_reels', 'LOAD', { selectedGenre });
      
      const reels = await reelService.getTrendingReels(50, 0);
      const trendingReelsData = reels.map(convertReelToTrending);
      
      setTrendingReels(trendingReelsData);
      debug.dbSuccess('trending_reels', 'LOAD', { count: trendingReelsData.length });
    } catch (error) {
      debug.dbError('trending_reels', 'LOAD', { error: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenre]);

  // Load trending reels on mount
  useEffect(() => {
    loadTrendingReels();
  }, [loadTrendingReels]);

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Trending screen loaded', { 
      reelsCount: trendingReels.length,
      selectedGenre,
      filters 
    });
  }, [trendingReels.length]);

  const scrollY = useSharedValue(0);
  const filterGlow = useSharedValue(0);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  React.useEffect(() => {
    filterGlow.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.value = offsetY;
  };

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.95],
      'clamp'
    );
    
    return {
      opacity,
    };
  });

  const filterAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(filterGlow.value, [0, 1], [0.2, 0.4]),
      shadowRadius: interpolate(filterGlow.value, [0, 1], [4, 8]),
    };
  });

  const handleLike = useCallback(async (reelId: string) => {
    debug.userAction('Like trending reel', { reelId });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await reelService.toggleLike(reelId);
      setTrendingReels(prevReels =>
        prevReels.map(reel =>
          reel.id === reelId
            ? { 
                ...reel, 
                isLiked: !reel.isLiked, 
                likes: reel.isLiked ? reel.likes - 1 : reel.likes + 1 
              }
            : reel
        )
      );
    } catch (error) {
      debug.dbError('trending_reel_like', 'TOGGLE', { error: (error as Error).message });
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    debug.userAction('Refresh trending reels', { currentReelsCount: trendingReels.length });
    setIsRefreshing(true);
    
    try {
      await loadTrendingReels();
      debug.userAction('Trending reels refreshed', { newReelsCount: trendingReels.length });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      debug.dbError('trending_reels', 'REFRESH', { error: (error as Error).message });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTrendingReels, trendingReels.length]);

  const handleGenreSelect = useCallback((genre: string) => {
    debug.userAction('Select genre filter', { previousGenre: selectedGenre, newGenre: genre });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenre(genre);
  }, [selectedGenre]);

  const handleFilterApply = useCallback(() => {
    debug.userAction('Apply filters', { filters });
    setShowFilterModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [filters]);

  const handleReelPress = useCallback((reel: TrendingReel) => {
    debug.userAction('Press trending reel', { reelId: reel.id, genre: reel.genre, hashtags: reel.hashtags });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Navigate to reels tab with hashtag context
    // Store hashtags in AsyncStorage or pass via navigation params
    if (reel.hashtags && reel.hashtags.length > 0) {
      // Navigate to reels tab with specific hashtags
      router.push({
        pathname: '/(tabs)/reels',
        params: { 
          hashtags: JSON.stringify(reel.hashtags),
          startReelId: reel.id 
        }
      });
    } else {
      // Navigate to regular reels tab
      router.push('/(tabs)/reels');
    }
  }, [router]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const filteredReels = selectedGenre === 'All' 
    ? trendingReels 
    : trendingReels.filter(reel => reel.genre === selectedGenre);

  const ReelItem = React.memo(({ reel, index, section = 'trending' }: { reel: TrendingReel; index: number; section?: string }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const handlePressIn = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(0.96);
      opacity.value = withTiming(0.8);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
    };

    const handlePress = () => {
      handleReelPress(reel);
    };

    const handleLikePress = (e: any) => {
      e.stopPropagation();
      handleLike(reel.id);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const itemHeight = ITEM_WIDTH * reel.aspectRatio;

    return (
      <AnimatedTouchableOpacity
        style={[
          styles.postItem,
          {
            width: ITEM_WIDTH,
            height: itemHeight,
            marginBottom: PADDING,
            marginRight: (index % 2 === 0) ? PADDING : 0,
          },
          animatedStyle
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: reel.thumbnailUrl || 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400' }}
          style={styles.postBackground}
          imageStyle={styles.postImage}
        >
          {/* Gradient overlay for better text visibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
            style={styles.gradientOverlay}
          />
          
          {/* Shorts logo for trending section */}
          {section === 'trending' && (
            <View style={styles.shortsLogo}>
              <Play size={24} color="#C9B6FF" fill="#C9B6FF" />
              <Text style={styles.shortsText}>Shorts</Text>
            </View>
          )}

          {/* Stats overlay */}
          <View style={styles.statsOverlay}>
            <View style={styles.statItem}>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={handleLikePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Heart
                  size={14}
                  color={reel.isLiked ? '#E74C3C' : '#EAEAEA'}
                  fill={reel.isLiked ? '#E74C3C' : 'transparent'}
                />
              </TouchableOpacity>
              <Text style={styles.statText}>{formatNumber(reel.likes)}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Eye size={12} color="#999999" />
              <Text style={styles.statTextMuted}>{formatNumber(reel.views)}</Text>
            </View>
          </View>
        </ImageBackground>
      </AnimatedTouchableOpacity>
    );
  });

  const renderGenreFilter = ({ item }: { item: string }) => {
    const isSelected = item === selectedGenre;
    return (
      <TouchableOpacity
        style={[styles.genreChip, isSelected && styles.selectedGenreChip]}
        onPress={() => handleGenreSelect(item)}
      >
        <Text style={[styles.genreText, isSelected && styles.selectedGenreText]}>
          {item}
        </Text>
        {isSelected && <View style={styles.selectedIndicator} />}
      </TouchableOpacity>
    );
  };

  // Create masonry layout data
  const masonryData = React.useMemo(() => {
    const leftColumn: TrendingReel[] = [];
    const rightColumn: TrendingReel[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    filteredReels.forEach((reel, index) => {
      const itemHeight = ITEM_WIDTH * reel.aspectRatio;
      
      if (leftHeight <= rightHeight) {
        leftColumn.push(reel);
        leftHeight += itemHeight + PADDING;
      } else {
        rightColumn.push(reel);
        rightHeight += itemHeight + PADDING;
      }
    });

    return { leftColumn, rightColumn };
  }, [filteredReels]);

  const renderMasonryColumn = (columnData: TrendingReel[], columnIndex: number) => (
    <View style={styles.masonryColumn}>
      {columnData.map((reel, index) => (
        <ReelItem key={reel.id} reel={reel} index={columnIndex} section="trending" />
      ))}
    </View>
  );

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>
          {!fontsLoaded ? 'Loading fonts...' : 'Loading trending reels...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      
      {/* Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <View style={styles.logoContainer}>
          <Heart size={22} color="#E74C3C" fill="#E74C3C" />
          <Text style={[styles.logoText, { fontFamily: 'Inter_700Bold' }]}>
            The Club
          </Text>
        </View>
        
        <Animated.View style={filterAnimatedStyle}>
          <TouchableOpacity 
            onPress={() => setShowFilterModal(true)} 
            style={styles.filterButton}
          >
            <Filter size={20} color="#8A2BE2" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Genre Filter Bar */}
      <View style={styles.genreSection}>
        <FlatList
          data={genres}
          renderItem={renderGenreFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreList}
        />
      </View>

      {/* Masonry Posts Grid */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8A2BE2"
            progressBackgroundColor="#1E1E1E"
            colors={['#8A2BE2']}
          />
        }
      >
        <View style={styles.masonryContainer}>
          {renderMasonryColumn(masonryData.leftColumn, 0)}
          {renderMasonryColumn(masonryData.rightColumn, 1)}
        </View>
      </Animated.ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} style={styles.modalBlur}>
            <View style={styles.filterModal}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                  Filters
                </Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <X size={24} color="#EAEAEA" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Content Type */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { fontFamily: 'Inter_500Medium' }]}>
                    Content Type
                  </Text>
                  <View style={styles.filterOptions}>
                    {contentTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.filterOption,
                          filters.contentType === type && styles.selectedFilterOption
                        ]}
                        onPress={() => setFilters(prev => ({ ...prev, contentType: type }))}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.contentType === type && styles.selectedFilterOptionText
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Date Range */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { fontFamily: 'Inter_500Medium' }]}>
                    Date Range
                  </Text>
                  <View style={styles.filterOptions}>
                    {dateFilters.map((date) => (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.filterOption,
                          filters.date === date && styles.selectedFilterOption
                        ]}
                        onPress={() => setFilters(prev => ({ ...prev, date }))}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.date === date && styles.selectedFilterOptionText
                        ]}>
                          {date}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Region */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { fontFamily: 'Inter_500Medium' }]}>
                    Region
                  </Text>
                  <View style={styles.filterOptions}>
                    {regions.map((region) => (
                      <TouchableOpacity
                        key={region}
                        style={[
                          styles.filterOption,
                          filters.region === region && styles.selectedFilterOption
                        ]}
                        onPress={() => setFilters(prev => ({ ...prev, region }))}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.region === region && styles.selectedFilterOptionText
                        ]}>
                          {region}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Trending Style */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { fontFamily: 'Inter_500Medium' }]}>
                    Trending Style
                  </Text>
                  <View style={styles.filterOptions}>
                    {trendingStyles.map((style) => (
                      <TouchableOpacity
                        key={style}
                        style={[
                          styles.filterOption,
                          filters.trendingStyle === style && styles.selectedFilterOption
                        ]}
                        onPress={() => setFilters(prev => ({ ...prev, trendingStyle: style }))}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.trendingStyle === style && styles.selectedFilterOptionText
                        ]}>
                          {style}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.applyButton} onPress={handleFilterApply}>
                <LinearGradient
                  colors={['#8A2BE2', '#6A1B9A']}
                  style={styles.applyButtonGradient}
                >
                  <Text style={[styles.applyButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                    Apply Filters
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
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
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#EAEAEA',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#EAEAEA',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  filterButton: {
    padding: 10,
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    borderRadius: 20,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  genreSection: {
    paddingVertical: 8,
    backgroundColor: '#1E1E1E',
  },
  genreList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.2)',
  },
  selectedGenreChip: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  genreText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedGenreText: {
    color: '#EAEAEA',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: 'rgba(138, 43, 226, 0.3)',
    borderRadius: 22,
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
    paddingBottom: 20,
  },
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  masonryColumn: {
    flex: 1,
  },
  postItem: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  postImage: {
    borderRadius: 16,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  shortsLogo: {
    position: 'absolute',
    bottom: 12,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  shortsText: {
    color: '#C9B6FF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeButton: {
    padding: 2,
  },
  statText: {
    color: '#EAEAEA',
    fontSize: 10,
    fontWeight: '600',
  },
  statTextMuted: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 43, 226, 0.2)',
  },
  modalTitle: {
    color: '#EAEAEA',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.2)',
  },
  selectedFilterOption: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2',
  },
  filterOptionText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFilterOptionText: {
    color: '#EAEAEA',
    fontWeight: '600',
  },
  applyButton: {
    margin: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '600',
  },
});